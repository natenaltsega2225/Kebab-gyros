import { db } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';
import { ok, fail } from '../../../../lib/http';
import { userCreateSchema } from '../../../../lib/validation';
import {
  generateTemporaryPassword,
  hashPassword,
} from '../../../../lib/security';
import { sendTemporaryCredentials } from '../../../../lib/email';
import { audit } from '../../../../lib/audit';

export async function GET(request) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.trim() || '';
    const role = searchParams.get('role')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const page = Math.max(
      Number.parseInt(searchParams.get('page') || '1', 10),
      1
    );

    const pageSize = Math.min(
      Math.max(
        Number.parseInt(searchParams.get('pageSize') || '25', 10),
        1
      ),
      100
    );

    const where = [];
    const values = [];

    if (search) {
      where.push(`
        (
          username LIKE ?
          OR email LIKE ?
          OR full_name LIKE ?
        )
      `);

      const term = `%${search}%`;

      values.push(term, term, term);
    }

    if (role === 'admin' || role === 'manager') {
      where.push('role = ?');
      values.push(role);
    }

    if (status === 'active') {
      where.push('is_active = 1');
    }

    if (status === 'inactive') {
      where.push('is_active = 0');
    }

    const whereSql = where.length
      ? `WHERE ${where.join(' AND ')}`
      : '';

    const offset = (page - 1) * pageSize;

    const [countRows] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM admin_users
        ${whereSql}
      `,
      values
    );

    const [rows] = await db.query(
      `
        SELECT
          id,
          username,
          email,
          full_name AS fullName,
          role,
          must_change_password AS mustChangePassword,
          is_active AS isActive,
          failed_login_count AS failedLoginCount,
          locked_until AS lockedUntil,
          last_login_at AS lastLoginAt,
          password_changed_at AS passwordChangedAt,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM admin_users
        ${whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        OFFSET ?
      `,
      [...values, pageSize, offset]
    );

    const total = Number(countRows[0]?.total || 0);

    return ok({
      users: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);

    return fail(
      'Unable to load admin users',
      500
    );
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request);

  if (!auth.ok) {
    return fail(auth.error, auth.status);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const parsed = userCreateSchema.safeParse(body);

  if (!parsed.success) {
    return fail(
      'Invalid user data',
      422,
      parsed.error.flatten()
    );
  }

  const {
    username,
    email,
    fullName,
    role,
  } = parsed.data;

  const normalizedUsername = username.trim();
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const temporaryPassword =
    generateTemporaryPassword();

  const passwordHash = await hashPassword(
    temporaryPassword
  );

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] =
      await connection.query(
        `
          SELECT
            id,
            username,
            email
          FROM admin_users
          WHERE username = ?
             OR email = ?
          LIMIT 1
        `,
        [
          normalizedUsername,
          normalizedEmail,
        ]
      );

    if (existingRows.length) {
      await connection.rollback();

      const existing = existingRows[0];

      if (
        existing.username ===
        normalizedUsername
      ) {
        return fail(
          'Username already exists',
          409
        );
      }

      return fail(
        'Email already exists',
        409
      );
    }

    const [result] =
      await connection.query(
        `
          INSERT INTO admin_users
          (
            username,
            email,
            full_name,
            role,
            password_hash,
            must_change_password,
            is_active,
            failed_login_count,
            locked_until,
            password_changed_at
          )
          VALUES
          (?, ?, ?, ?, ?, 1, 1, 0, NULL, NULL)
        `,
        [
          normalizedUsername,
          normalizedEmail,
          fullName,
          role,
          passwordHash,
        ]
      );

    const userId = result.insertId;

    await connection.commit();

    let credentialDelivery = 'sent';

    try {
      await sendTemporaryCredentials({
        email: normalizedEmail,
        username: normalizedUsername,
        temporaryPassword,
      });
    } catch (emailError) {
      console.error(
        'Temporary credential email failed:',
        emailError
      );

      credentialDelivery = 'failed';
    }

    await audit(
      request,
      auth.user.id,
      'USER_CREATED',
      'admin_user',
      userId,
      {
        username: normalizedUsername,
        email: normalizedEmail,
        fullName,
        role,
        credentialDelivery,
      }
    );

    return ok(
      {
        id: userId,
        username: normalizedUsername,
        email: normalizedEmail,
        fullName,
        role,
        isActive: true,
        mustChangePassword: true,
        credentialDelivery,

        ...(credentialDelivery === 'failed' &&
        process.env.NODE_ENV !== 'production'
          ? {
              temporaryPassword,
            }
          : {}),
      },
      201
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback failure.
    }

    console.error(error);

    if (error?.code === 'ER_DUP_ENTRY') {
      if (
        String(error.message).includes(
          'uq_admin_username'
        )
      ) {
        return fail(
          'Username already exists',
          409
        );
      }

      return fail(
        'Email already exists',
        409
      );
    }

    return fail(
      'Unable to create admin user',
      500
    );
  } finally {
    connection.release();
  }
}

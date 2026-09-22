require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main(){
  const username=String(process.env.ADMIN_USERNAME||'admin').trim();
  const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
  const password=String(process.env.ADMIN_PASSWORD||'');
  if(!username || !email || password.length<12) throw new Error('Set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD (minimum 12 characters) in .env');
  const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  const hash=await bcrypt.hash(password,12);
  await pool.query(`INSERT INTO admin_users(username,email,full_name,role,password_hash,must_change_password,is_active)
    VALUES(?,?,?,'admin',?,1,1)
    ON DUPLICATE KEY UPDATE email=VALUES(email),password_hash=VALUES(password_hash),role='admin',must_change_password=1,is_active=1`,[username,email,'System Administrator',hash]);
  console.log(`Admin user ready: ${username} (${email})`);
  console.log('The bootstrap administrator must change the temporary/bootstrap password after first login.');
  await pool.end();
}
main().catch(e=>{console.error(e.message);process.exit(1)});

# Supabase Setup Guide

## ✅ Your Supabase Project

**Project URL**: https://ciwtrbfsgsbbxlwgtdqp.supabase.co
**Project ID**: ciwtrbfsgsbbxlwgtdqp

---

## 🔑 Get Your Database Password

You need to get your database password from Supabase:

### Step 1: Go to Database Settings
1. Open: https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/settings/database
2. Or navigate: **Settings** → **Database** in your Supabase dashboard

### Step 2: Find Connection String
Scroll down to **Connection string** section and look for:
- **URI** or **Connection string**
- It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.ciwtrbfsgsbbxlwgtdqp.supabase.co:5432/postgres`

### Step 3: Copy Your Password
The password is between `postgres:` and `@db.ciwtrbfsgsbbxlwgtdqp`

Example:
```
postgresql://postgres:YOUR_PASSWORD_HERE@db.ciwtrbfsgsbbxlwgtdqp.supabase.co:5432/postgres
                      ^^^^^^^^^^^^^^^^^^
                      This is your password
```

### Step 4: Update .env File
Open `.env` and replace:
```env
DB_PASSWORD=YOUR_SUPABASE_PASSWORD_HERE
```

With your actual password:
```env
DB_PASSWORD=your_actual_password_from_supabase
```

---

## 🚀 Setup Database Tables

Once you've added the password:

```bash
cd backend
node setup-database.js
```

This will create all the necessary tables in your Supabase database.

---

## ✅ Verify Connection

After setup, start your backend:
```bash
cd backend
npm start
```

You should see:
```
✅ Database connected successfully
PostgreSQL version: PostgreSQL 15.x...
```

---

## 🔒 Security Notes

1. ✅ **Never commit** your database password to git
2. ✅ The `.env` file is already in `.gitignore`
3. ✅ Your Supabase project has Row Level Security (RLS) - you can enable it later
4. ✅ The anon key is safe to use in frontend (it's public)

---

## 📊 Supabase Dashboard Features

You can use the Supabase dashboard to:

1. **Table Editor**: View and edit data
   - https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/editor

2. **SQL Editor**: Run custom queries
   - https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/sql

3. **Database**: View tables, indexes, etc.
   - https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/database/tables

4. **Logs**: Monitor database activity
   - https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/logs/postgres-logs

---

## 🐛 Troubleshooting

### "Connection refused" or "timeout"
- Check your internet connection
- Verify the password is correct
- Make sure you copied the full password (no spaces)

### "Database does not exist"
- The database name should be `postgres` (default)
- Don't change `DB_NAME` in .env

### "Authentication failed"
- Double-check your password
- Copy it again from Supabase dashboard
- Make sure there are no extra spaces

### Still not working?
1. Go to Supabase dashboard
2. Settings → Database
3. Click "Reset database password"
4. Copy the new password
5. Update .env file

---

## 📝 What's Already Configured

✅ Database host: `db.ciwtrbfsgsbbxlwgtdqp.supabase.co`
✅ Database port: `5432`
✅ Database name: `postgres`
✅ Database user: `postgres`
❌ Database password: **YOU NEED TO ADD THIS**

✅ Supabase URL: `https://ciwtrbfsgsbbxlwgtdqp.supabase.co`
✅ Supabase API Key: Already added to .env

---

## 🎯 Next Steps

1. **Get password** from Supabase dashboard
2. **Update .env** with the password
3. **Run setup**: `node backend/setup-database.js`
4. **Start backend**: `npm start`
5. **Test signup** in your app

---

## 💡 Pro Tips

### View Your Data
After creating users, view them in Supabase:
1. Go to Table Editor
2. Select `users` table
3. See all registered users

### Run SQL Queries
```sql
-- View all users
SELECT * FROM users;

-- View OTP requests
SELECT * FROM otp_requests ORDER BY created_at DESC;

-- Count users
SELECT COUNT(*) FROM users;
```

### Backup Your Data
Supabase automatically backs up your database daily!

---

**Ready?** Get your password and let's set it up! 🚀

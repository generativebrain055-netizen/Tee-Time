# 🚀 Quick Supabase Setup (2 Minutes)

## Step 1: Get Your Password

1. Go to: https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/settings/database
2. Scroll to **Connection string**
3. Copy the password from the URI (between `postgres:` and `@db.`)

## Step 2: Update .env

Open `.env` file and replace:
```env
DB_PASSWORD=YOUR_SUPABASE_PASSWORD_HERE
```

With your actual password.

## Step 3: Setup Database

```bash
cd backend
node setup-database.js
```

## Step 4: Start Backend

```bash
npm start
```

You should see:
```
✅ Database connected successfully
```

## Step 5: Test Signup

```bash
cd ../TTSGolfApp
npm start
```

Try signing up with:
- Name: Test User
- Phone: +923001234567
- Handicap: 15

---

## ✅ Done!

Your app is now connected to Supabase PostgreSQL!

View your data: https://supabase.com/dashboard/project/ciwtrbfsgsbbxlwgtdqp/editor

---

## 🐛 Issues?

**"Connection refused"**
- Check your password is correct
- No extra spaces in .env

**"Authentication failed"**
- Copy password again from Supabase
- Make sure you saved .env file

**Need help?**
See `SUPABASE_SETUP.md` for detailed guide.

# MongoDB Atlas Setup Guide for Disfruta Platform

## Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Get started free"
3. Create your account with email/password
4. Verify your email address

## Step 2: Create a Free Cluster

1. Create a new project (name it "Disfruta Platform")
2. Click "Create a deployment"
3. Select **M0 Sandbox** (FREE tier)
4. Choose your preferred cloud provider (AWS recommended)
5. Select region closest to your users
6. Name your cluster (e.g., "disfruta-cluster")
7. Click "Create Deployment"

## Step 3: Configure Database Access

1. Go to "Database Access" in left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `disfruta_user`
5. Password: Generate a secure password (save it!)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

## Step 4: Configure Network Access

1. Go to "Network Access" in left sidebar
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your specific server IP addresses
5. Click "Confirm"

## Step 5: Get Connection String

1. Go to "Database" in left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" driver version 4.1 or later
5. Copy the connection string - it will look like:
   ```
   mongodb+srv://disfruta_user:<password>@disfruta-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual database user password

## Step 6: Update Environment Variables

Once you have your connection string, I'll update the backend configuration:

```bash
# Your MongoDB Atlas connection string should look like:
MONGO_URI=mongodb+srv://disfruta_user:YOUR_PASSWORD@disfruta-cluster.xxxxx.mongodb.net/disfruta?retryWrites=true&w=majority
```

## Next Steps

1. Complete the Atlas setup above
2. Provide me with your connection string
3. I'll update the backend configuration
4. Test the database connection
5. Verify all API endpoints work with persistent storage

## Benefits of MongoDB Atlas

- ✅ Free tier with 512MB storage
- ✅ Automatic backups
- ✅ Built-in security features
- ✅ Global cloud infrastructure
- ✅ Easy scaling when needed
- ✅ No server maintenance required

---

**Please complete steps 1-5 above and provide me with your MongoDB Atlas connection string so I can configure the backend.**
# FarmDirect - Farmer to Consumer App

A full-stack application connecting farmers directly with consumers using Next.js, Node.js, Prisma, and PostgreSQL.

## Features

- **Farmer Module**: Voice-based Crop Upload, Easy Dashboard, Order Management.
- **Consumer Module**: Marketplace, Cart, Distance-based Delivery Calculation.
- **Tech Stack**: Next.js 16, Prisma ORM, PostgreSQL, Tailwind CSS, Web Speech API.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/farmdirect?schema=public"
   JWT_SECRET="supersecret"
   ```
   *Replace credentials with your PostgreSQL details.*

3. **Database Setup**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Seed Data (Optional)**
   To mock pincode locations:
   ```bash
   npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts
   # Or just run manually if ts-node issues arise
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Usage**
   - **Farmer**: Go to `/farmer/login`. Use Voice Input ("Tomato 50") to upload crops.
   - **Consumer**: Go to `/consumer`. Register, browse crops, and place orders.

## Project Structure
- `app/api`: Backend API Routes.
- `app/farmer`: Farmer pages.
- `app/consumer`: Consumer pages.
- `lib/`: Utilities (Distance calc, Auth, Prisma).
- `prisma/`: Database Schema.

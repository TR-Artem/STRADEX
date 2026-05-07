-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "inn" TEXT,
    "city" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "orgType" TEXT NOT NULL DEFAULT 'COMMERCIAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "maxLocations" INTEGER NOT NULL DEFAULT 1,
    "maxDevices" INTEGER NOT NULL DEFAULT 10
);

-- CreateTable
CREATE TABLE "OrganizationUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrganizationUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParkingLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "totalSpots" INTEGER NOT NULL,
    "hourlyRate" INTEGER NOT NULL,
    "firstFreeMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxDailyRate" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParkingLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParkingCamera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rtspUrl" TEXT NOT NULL,
    "ipAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPingAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParkingCamera_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ParkingLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EdgeDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hmacSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeatAt" DATETIME,
    "firmwareVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EdgeDevice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EdgeDevice_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ParkingLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "plateRaw" TEXT,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhitelistRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "plateNumber" TEXT NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME,
    "validTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhitelistRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WhitelistRule_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlacklistRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "plateNumber" TEXT NOT NULL,
    "reason" TEXT,
    "alertLevel" TEXT NOT NULL DEFAULT 'WARNING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlacklistRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BlacklistRule_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER,
    "durationDays" INTEGER,
    "maxVisits" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriptionVehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "visitsRemaining" INTEGER,
    "balanceRemaining" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionVehicle_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuestPass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "plateNumber" TEXT NOT NULL,
    "passType" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usesRemaining" INTEGER NOT NULL DEFAULT 1,
    "qrCode" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestPass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GuestPass_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParkingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "plateNumber" TEXT NOT NULL,
    "plateRaw" TEXT,
    "plateConfidence" REAL,
    "entryCameraId" TEXT,
    "entryDeviceId" TEXT,
    "entryTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entryPhoto" TEXT,
    "exitCameraId" TEXT,
    "exitDeviceId" TEXT,
    "exitTime" DATETIME,
    "duration" INTEGER,
    "amount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParkingSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ParkingLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParkingSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "yookassaPaymentId" TEXT,
    "yookassaCheckoutUrl" TEXT,
    "fiscalReceiptId" TEXT,
    "paidAt" DATETIME,
    "refundedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "OrganizationUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUser_email_key" ON "OrganizationUser"("email");

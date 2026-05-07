-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ParkingSession" (
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
    "clientType" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParkingSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ParkingLocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParkingSession_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ParkingSession" ("amount", "createdAt", "duration", "entryCameraId", "entryDeviceId", "entryPhoto", "entryTime", "exitCameraId", "exitDeviceId", "exitTime", "id", "locationId", "organizationId", "paidAt", "paymentMethod", "paymentStatus", "plateConfidence", "plateNumber", "plateRaw", "status", "updatedAt", "vehicleId") SELECT "amount", "createdAt", "duration", "entryCameraId", "entryDeviceId", "entryPhoto", "entryTime", "exitCameraId", "exitDeviceId", "exitTime", "id", "locationId", "organizationId", "paidAt", "paymentMethod", "paymentStatus", "plateConfidence", "plateNumber", "plateRaw", "status", "updatedAt", "vehicleId" FROM "ParkingSession";
DROP TABLE "ParkingSession";
ALTER TABLE "new_ParkingSession" RENAME TO "ParkingSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

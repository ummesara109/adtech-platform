import {
  ApprovalStatus,
  CampaignStatus,
  CreativeModerationStatus,
  CreativeType,
  DeliveryStatus,
  DeviceOnlineStatus,
  DevicePairingStatus,
  DriverAccountStatus,
  MembershipRole,
  PaymentStatus,
  PayoutStatus,
  PlatformRole,
  PlaybackEventType,
  PrismaClient,
  ScreenBookingStatus,
  ScreenStatus,
  VerificationStatus,
  VehicleStatus,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const DEMO_PASSWORD_HASH = bcrypt.hashSync('password123', 10)

const AREAS: { area: string; lat: number; lng: number }[] = [
  { area: 'Whitefield', lat: 12.9698, lng: 77.75 },
  { area: 'Marathahalli', lat: 12.9591, lng: 77.6974 },
  { area: 'Electronic City', lat: 12.8452, lng: 77.6602 },
  { area: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { area: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { area: 'HSR Layout', lat: 12.9116, lng: 77.6473 },
]

/** Deterministic IST → UTC helper for seed bookings. */
function istToUtc(dateYmd: string, hm: string) {
  const [y, m, d] = dateYmd.split('-').map(Number)
  const [hh, mm] = hm.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0) - 330 * 60_000)
}

const KYC_DOCS = [
  'Company registration (Certificate of Incorporation)',
  'GST registration certificate',
  'Authorized signatory ID',
  'Business address proof',
]

type Scenario = 'empty' | 'drafts' | 'pending' | 'live' | 'completed'

async function upsertAdmin() {
  const email = 'admin@autoads.test'
  const user = await prisma.user.upsert({
    where: { email },
    update: { fullName: 'AutoAds Admin', passwordHash: DEMO_PASSWORD_HASH },
    create: {
      email,
      fullName: 'AutoAds Admin',
      phone: '+91 90000 00001',
      passwordHash: DEMO_PASSWORD_HASH,
      authUserId: `local-${email}`,
      roles: { create: { role: PlatformRole.SuperAdmin } },
    },
  })
  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: PlatformRole.SuperAdmin } },
    update: {},
    create: { userId: user.id, role: PlatformRole.SuperAdmin },
  })
  return user
}

async function upsertDriverPartner() {
  const email = 'driver@autoads.test'
  const user = await prisma.user.upsert({
    where: { email },
    update: { fullName: 'Ravi Kumar', passwordHash: DEMO_PASSWORD_HASH },
    create: {
      email,
      fullName: 'Ravi Kumar',
      phone: '+91 98765 43210',
      passwordHash: DEMO_PASSWORD_HASH,
      authUserId: `local-${email}`,
      roles: { create: { role: PlatformRole.Driver } },
    },
  })

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: PlatformRole.Driver } },
    update: {},
    create: { userId: user.id, role: PlatformRole.Driver },
  })

  const driver = await prisma.driver.upsert({
    where: { userId: user.id },
    update: {
      accountStatus: DriverAccountStatus.Active,
      kycStatus: VerificationStatus.Verified,
      licenseNumber: 'KA-01-2020-1234567',
      city: 'Bengaluru',
      address: 'HSR Layout, Sector 2',
    },
    create: {
      userId: user.id,
      accountStatus: DriverAccountStatus.Active,
      kycStatus: VerificationStatus.Verified,
      licenseNumber: 'KA-01-2020-1234567',
      city: 'Bengaluru',
      address: 'HSR Layout, Sector 2',
      kycDocuments: {
        create: [
          { label: 'Aadhaar card', status: 'Approved', storageKey: 'kyc/driver/aadhaar-redacted' },
          { label: 'Driving license', status: 'Approved', storageKey: 'kyc/driver/license-redacted' },
          { label: 'Vehicle RC copy', status: 'Approved' },
          { label: 'Profile photograph', status: 'Approved' },
        ],
      },
    },
  })

  const vehicle = await prisma.vehicle.upsert({
    where: { registrationNumber: 'KA03AA1234' },
    update: { driverId: driver.id, status: VehicleStatus.Active, makeModel: 'Bajaj RE', color: 'Green' },
    create: {
      driverId: driver.id,
      registrationNumber: 'KA03AA1234',
      makeModel: 'Bajaj RE',
      year: 2022,
      color: 'Green',
      status: VehicleStatus.Active,
    },
  })

  const device = await prisma.device.upsert({
    where: { serialNumber: 'AUTADS-HSR-001' },
    update: {
      onlineStatus: DeviceOnlineStatus.Online,
      lastSeenAt: new Date(),
      firmwareVersion: '1.2.0',
      mqttClientId: 'autoads-dev-001',
    },
    create: {
      serialNumber: 'AUTADS-HSR-001',
      firmwareVersion: '1.2.0',
      mqttClientId: 'autoads-dev-001',
      onlineStatus: DeviceOnlineStatus.Online,
      lastSeenAt: new Date(),
    },
  })

  await prisma.deviceTelemetry.create({
    data: {
      deviceId: device.id,
      connectivity: '4G',
      signalStrength: -72,
    },
  })

  const existingAssignment = await prisma.deviceAssignment.findFirst({
    where: { driverId: driver.id, deviceId: device.id, unassignedAt: null },
  })
  if (!existingAssignment) {
    await prisma.deviceAssignment.create({
      data: {
        driverId: driver.id,
        deviceId: device.id,
        vehicleId: vehicle.id,
        pairingCode: 'PAIR-HSR-001',
        pairingStatus: DevicePairingStatus.Paired,
      },
    })
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  await prisma.partnerEarning.upsert({
    where: {
      driverId_periodYear_periodMonth: { driverId: driver.id, periodYear: year, periodMonth: month },
    },
    update: { grossAmountInr: 4200, commissionInr: 420, netAmountInr: 3780 },
    create: {
      driverId: driver.id,
      periodYear: year,
      periodMonth: month,
      grossAmountInr: 4200,
      commissionInr: 420,
      netAmountInr: 3780,
    },
  })

  await prisma.partnerIncentive.deleteMany({ where: { driverId: driver.id } })
  await prisma.partnerIncentive.createMany({
    data: [
      { driverId: driver.id, title: 'Peak hour bonus', amountInr: 500, status: 'Earned', earnedAt: now },
      { driverId: driver.id, title: 'Weekly uptime target', amountInr: 300, status: 'Pending' },
    ],
  })

  await prisma.payout.deleteMany({ where: { driverId: driver.id } })
  await prisma.payout.create({
    data: {
      driverId: driver.id,
      amountInr: 3780,
      status: PayoutStatus.Paid,
      reference: 'PAY-DEV-2026-001',
      paidOn: now,
    },
  })

  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  await prisma.adPlaybackLog.deleteMany({
    where: { driverId: driver.id, createdAt: { gte: startOfDay } },
  })
  await prisma.adPlaybackLog.createMany({
    data: [
      {
        driverId: driver.id,
        deviceId: device.id,
        vehicleId: vehicle.id,
        eventType: PlaybackEventType.Started,
        idempotencyKey: `seed-${driver.id}-start-1`,
        startedAt: now,
        validDurationSec: 0,
      },
      {
        driverId: driver.id,
        deviceId: device.id,
        vehicleId: vehicle.id,
        eventType: PlaybackEventType.Completed,
        idempotencyKey: `seed-${driver.id}-complete-1`,
        startedAt: new Date(now.getTime() - 120_000),
        endedAt: now,
        validDurationSec: 120,
      },
    ],
  })

  return { email, driverId: driver.id, vehicle: vehicle.registrationNumber }
}

async function upsertAdvertiser(input: {
  email: string
  fullName: string
  tradeName: string
  verification: VerificationStatus
  scenario: Scenario
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { fullName: input.fullName },
    create: {
      email: input.email,
      fullName: input.fullName,
      authUserId: `local-${input.email}`,
      phone: '+91 90000 00000',
    },
  })

  let membership = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    include: { company: true },
  })

  let company = membership?.company
  if (!company) {
    company = await prisma.company.create({
      data: {
        legalName: `${input.tradeName} Private Limited`,
        tradeName: input.tradeName,
        businessType: 'Private limited company',
        city: 'Bengaluru',
        industry: 'Retail',
        verificationStatus: input.verification,
        verificationNotes:
          input.verification === VerificationStatus.Verified
            ? 'KYC verified for advertiser portal testing.'
            : 'Complete company documents to submit campaigns for approval.',
        verificationSubmittedOn: new Date(),
        verificationReviewedOn:
          input.verification === VerificationStatus.Verified ? new Date() : null,
        documents: {
          create: KYC_DOCS.map((label) => ({
            label,
            status: input.verification === VerificationStatus.Verified ? 'Approved' : 'Required',
          })),
        },
      },
    })
    membership = await prisma.companyMember.create({
      data: {
        companyId: company.id,
        userId: user.id,
        role: MembershipRole.Admin,
      },
      include: { company: true },
    })
  } else {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { verificationStatus: input.verification, tradeName: input.tradeName },
    })
  }

  // Clear prior scenario data for this company so re-seed is deterministic
  await prisma.playbackReport.deleteMany({ where: { companyId: company.id } })
  await prisma.playbackDaily.deleteMany({ where: { companyId: company.id } })
  await prisma.locationPlayback.deleteMany({ where: { companyId: company.id } })
  await prisma.payment.deleteMany({ where: { companyId: company.id } })
  await prisma.invoice.deleteMany({ where: { companyId: company.id } })
  await prisma.campaignStatusEvent.deleteMany({ where: { campaign: { companyId: company.id } } })
  await prisma.campaign.deleteMany({ where: { companyId: company.id } })
  await prisma.creative.deleteMany({ where: { companyId: company.id } })
  await prisma.notification.deleteMany({ where: { companyId: company.id } })
  await prisma.activityEvent.deleteMany({ where: { companyId: company.id } })

  if (input.scenario === 'empty') {
    await prisma.activityEvent.create({
      data: {
        companyId: company.id,
        title: 'Workspace ready',
        body: 'New advertiser workspace with no campaigns yet.',
        kind: 'account',
      },
    })
    return { email: input.email, companyId: company.id, scenario: input.scenario }
  }

  const creative = await prisma.creative.create({
    data: {
      companyId: company.id,
      fileName: 'bengaluru-launch.mp4',
      type: CreativeType.Video,
      sizeLabel: '18 MB',
      moderationStatus:
        input.scenario === 'drafts'
          ? CreativeModerationStatus.Draft
          : input.scenario === 'pending'
            ? CreativeModerationStatus.PendingModeration
            : CreativeModerationStatus.Approved,
      previewNote: 'Seed creative for scenario testing',
    },
  })

  if (input.scenario === 'drafts') {
    await prisma.campaign.create({
      data: {
        publicId: 'CAM-DRAFT-1',
        companyId: company.id,
        name: 'Koramangala draft launch',
        description: 'Draft campaign for KYC-pending or early setup testing',
        status: CampaignStatus.Draft,
        approvalStatus: ApprovalStatus.Draft,
        deliveryStatus: DeliveryStatus.NotStarted,
        paymentStatus: PaymentStatus.Pending,
        locations: ['Koramangala'],
        requestedAutos: 50,
        budgetInr: 75000,
        creativeId: creative.id,
        events: { create: { status: CampaignStatus.Draft, note: 'Draft created' } },
      },
    })
  }

  if (input.scenario === 'pending') {
    await prisma.campaign.create({
      data: {
        publicId: 'CAM-PEND-1',
        companyId: company.id,
        name: 'HSR Layout submission',
        description: 'Submitted campaign awaiting admin approval',
        status: CampaignStatus.UnderReview,
        approvalStatus: ApprovalStatus.UnderReview,
        deliveryStatus: DeliveryStatus.NotStarted,
        paymentStatus: PaymentStatus.Authorized,
        startDate: new Date('2026-11-10'),
        endDate: new Date('2026-12-10'),
        locations: ['HSR Layout'],
        requestedAutos: 80,
        budgetInr: 120000,
        creativeId: creative.id,
        events: {
          create: [
            { status: CampaignStatus.Submitted, note: 'Submitted for approval' },
            { status: CampaignStatus.UnderReview, note: 'Admin review in progress' },
          ],
        },
      },
    })
    await prisma.invoice.create({
      data: {
        publicId: 'INV-PEND-1',
        companyId: company.id,
        campaignName: 'HSR Layout submission',
        amountInr: 120000,
        paymentStatus: PaymentStatus.Authorized,
      },
    })
    await prisma.notification.create({
      data: {
        companyId: company.id,
        title: 'Campaign approval pending',
        body: 'HSR Layout submission is under review.',
        category: 'Campaign status',
      },
    })
  }

  if (input.scenario === 'live' || input.scenario === 'completed') {
    const live = await prisma.campaign.create({
      data: {
        publicId: input.scenario === 'live' ? 'CAM-LIVE-1' : 'CAM-DONE-1',
        companyId: company.id,
        name: input.scenario === 'live' ? 'Indiranagar weekend brand' : 'Whitefield completed flight',
        description: 'Scenario campaign with Proof of Play records',
        status: input.scenario === 'live' ? CampaignStatus.Live : CampaignStatus.Completed,
        approvalStatus: ApprovalStatus.Approved,
        deliveryStatus: input.scenario === 'live' ? DeliveryStatus.Live : DeliveryStatus.Completed,
        paymentStatus: PaymentStatus.Paid,
        startDate: new Date('2026-10-01'),
        endDate: new Date(input.scenario === 'live' ? '2026-11-30' : '2026-10-31'),
        locations: input.scenario === 'live' ? ['Indiranagar', 'Koramangala'] : ['Whitefield'],
        requestedAutos: 120,
        allocatedAutos: 95,
        budgetInr: 200000,
        estimatedReach: 54000,
        creativeId: creative.id,
        events: {
          create: [
            { status: CampaignStatus.Submitted, note: 'Submitted' },
            { status: CampaignStatus.Approved, note: 'Admin approved after payment' },
            { status: CampaignStatus.Scheduled, note: 'Inventory booked' },
            {
              status: input.scenario === 'live' ? CampaignStatus.Live : CampaignStatus.Completed,
              note:
                input.scenario === 'live'
                  ? 'Activated on allocated auto-rickshaw screens'
                  : 'Flight completed',
            },
          ],
        },
      },
    })

    await prisma.invoice.create({
      data: {
        publicId: input.scenario === 'live' ? 'INV-LIVE-1' : 'INV-DONE-1',
        companyId: company.id,
        campaignId: live.id,
        campaignName: live.name,
        amountInr: 186000,
        paymentStatus: PaymentStatus.Paid,
      },
    })
    await prisma.payment.create({
      data: {
        publicId: input.scenario === 'live' ? 'TXN-LIVE-1' : 'TXN-DONE-1',
        companyId: company.id,
        campaignId: live.id,
        campaignName: live.name,
        reference: input.scenario === 'live' ? 'INV-LIVE-1' : 'INV-DONE-1',
        amountInr: 186000,
        status: PaymentStatus.Paid,
      },
    })

    const days = [1, 2, 3, 4, 5].map((offset) => {
      const date = new Date('2026-10-20')
      date.setDate(date.getDate() + offset)
      return date
    })
    for (const [index, date] of days.entries()) {
      await prisma.playbackDaily.create({
        data: {
          companyId: company.id,
          date,
          playbackStarts: 1000 + index * 120,
          completedPlays: 880 + index * 100,
          failedPlays: 120 + index * 10,
          scheduledPlays: 1100 + index * 120,
        },
      })
    }

    await prisma.playbackReport.create({
      data: {
        companyId: company.id,
        campaignId: live.id,
        periodLabel: '20 Oct – 2 Nov 2026',
        targetedDevices: 120,
        activeDevices: 95,
        playbackStarts: 5600,
        completedPlays: 4900,
        interruptedPlays: 700,
        completionRate: 87.5,
        runningHours: 410,
        expenditureInr: 186000,
      },
    })

    await prisma.locationPlayback.createMany({
      data: live.locations.map((area, index) => ({
        companyId: company.id,
        area,
        completedPlays: 2000 + index * 400,
        targetedDevices: 40 + index * 10,
      })),
    })
  }

  await prisma.activityEvent.create({
    data: {
      companyId: company.id,
      title: 'Seed scenario loaded',
      body: `Scenario ${input.scenario} ready for dashboard testing`,
      kind: 'account',
    },
  })

  return { email: input.email, companyId: company.id, scenario: input.scenario }
}

async function seedFleetInventory() {
  await prisma.screenBooking.deleteMany({})
  await prisma.adScreen.deleteMany({})

  const screensCreated: { id: string; locality: string; publicId: string }[] = []
  let seq = 1

  for (const area of AREAS) {
    await prisma.inventoryArea.upsert({
      where: { city_area: { city: 'Bengaluru', area: area.area } },
      update: { centerLat: area.lat, centerLng: area.lng },
      create: {
        city: 'Bengaluru',
        area: area.area,
        availableDevices: 0,
        centerLat: area.lat,
        centerLng: area.lng,
      },
    })

    for (let i = 0; i < 10; i += 1) {
      const status =
        i === 8 ? ScreenStatus.Inactive : i === 9 ? ScreenStatus.Maintenance : ScreenStatus.Active
      const publicId = `SCR-BLR-${String(seq).padStart(4, '0')}`
      const autoId = `AUTO-BLR-${String(seq).padStart(4, '0')}`
      const lat = area.lat + (i % 5) * 0.0018 - 0.0035
      const lng = area.lng + Math.floor(i / 5) * 0.0022 - 0.002
      const screen = await prisma.adScreen.create({
        data: {
          publicId,
          autoId,
          city: 'Bengaluru',
          locality: area.area,
          latitude: lat,
          longitude: lng,
          status,
          label: `${area.area} screen ${i + 1}`,
        },
      })
      screensCreated.push({ id: screen.id, locality: area.area, publicId })
      seq += 1
    }
  }

  // Overlap test bookings: Whitefield active screens 0–2 booked 09:00–11:00 IST on 2026-11-05
  const whitefieldActive = screensCreated.filter((s) => s.locality === 'Whitefield').slice(0, 3)
  for (const screen of whitefieldActive) {
    await prisma.screenBooking.create({
      data: {
        screenId: screen.id,
        startAt: istToUtc('2026-11-05', '09:00'),
        endAt: istToUtc('2026-11-05', '11:00'),
        status: ScreenBookingStatus.Confirmed,
        timezone: 'Asia/Kolkata',
        daysOfWeek: ['Wednesday'],
      },
    })
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${screensCreated.length} AdScreen rows + ${whitefieldActive.length} confirmed bookings (Whitefield 2026-11-05 09:00–11:00 IST)`,
  )
}

async function main() {
  await seedFleetInventory()

  const scenario = (process.env.SEED_SCENARIO as Scenario) || 'empty'

  const results = await Promise.all([
    upsertAdvertiser({
      email: 'new@autoads.test',
      fullName: 'New Advertiser',
      tradeName: 'Fresh Bengaluru Brand',
      verification: VerificationStatus.Pending,
      scenario: 'empty',
    }),
    upsertAdvertiser({
      email: 'drafts@autoads.test',
      fullName: 'Draft User',
      tradeName: 'Draft Foods',
      verification: VerificationStatus.Pending,
      scenario: 'drafts',
    }),
    upsertAdvertiser({
      email: 'pending@autoads.test',
      fullName: 'Pending User',
      tradeName: 'Pending Retail',
      verification: VerificationStatus.Verified,
      scenario: 'pending',
    }),
    upsertAdvertiser({
      email: 'live@autoads.test',
      fullName: 'Live User',
      tradeName: 'Live Mobility Ads',
      verification: VerificationStatus.Verified,
      scenario: 'live',
    }),
    upsertAdvertiser({
      email: 'completed@autoads.test',
      fullName: 'Completed User',
      tradeName: 'Completed Campaigns Co',
      verification: VerificationStatus.Verified,
      scenario: 'completed',
    }),
  ])

  // eslint-disable-next-line no-console
  console.log('Seeded inventory areas + advertiser scenarios:')
  // eslint-disable-next-line no-console
  console.table(results)
  // eslint-disable-next-line no-console
  console.log(`Default SEED_SCENARIO=${scenario} (all scenario users are always created)`)
  // eslint-disable-next-line no-console
  console.log('Dev login: POST /api/v1/auth/dev-login { "email": "live@autoads.test" }')

  const adminSeed = await upsertAdmin()
  const driverSeed = await upsertDriverPartner()
  // eslint-disable-next-line no-console
  console.log('Admin login: POST /api/v1/auth/admin/login { "email": "admin@autoads.test", "password": "password123" }')
  // eslint-disable-next-line no-console
  console.log('Driver login: POST /api/v1/auth/driver/login { "email": "driver@autoads.test", "password": "password123" }')
  // eslint-disable-next-line no-console
  console.log('Driver dev login: POST /api/v1/auth/driver/dev-login { "email": "driver@autoads.test" }')
  // eslint-disable-next-line no-console
  console.table([adminSeed, driverSeed])
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

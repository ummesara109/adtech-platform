import type { CompanyProfile, VerificationRecord } from '../types/advertiser'

export const companyProfile: CompanyProfile = {
  registeredOn: '12 Sep 2026',
  legalName: 'Namma Foods Private Limited',
  tradeName: 'Namma Foods',
  businessType: 'Private limited company',
  gstin: '29AABCN1234F1Z5',
  registeredAddress: '42, 100 Feet Road, Indiranagar',
  city: 'Bengaluru, Karnataka',
  contactName: 'Ananya Rao',
  contactEmail: 'ananya@nammafoods.example',
  contactPhone: '+91 98765 43210',
  industry: 'Restaurant / QSR',
}

export const verificationRecord: VerificationRecord = {
  status: 'Verified',
  submittedOn: '12 Sep 2026',
  reviewedOn: '15 Sep 2026',
  documents: [
    { label: 'Company registration (Certificate of Incorporation)', status: 'Approved' },
    { label: 'GST registration certificate', status: 'Approved' },
    { label: 'Authorized signatory ID', status: 'Approved' },
    { label: 'Business address proof', status: 'Approved' },
  ],
  notes:
    'Advertiser verification is required before campaigns can be approved for delivery. KYC data is restricted to authorized platform roles.',
}

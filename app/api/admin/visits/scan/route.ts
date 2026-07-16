export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('📥 Request Body:', body)
    const { memberId } = body
    console.log('=== SCAN API START ===')
    console.log('Received memberId:', memberId)

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID tidak ditemukan' },
        { status: 400 }
      )
    }

    // Cari member berdasarkan ID
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        isActive: true,
        membershipEnd: true,
        accessType: true,
        accessStart: true,
        accessEnd: true,
      },
    })
    console.log('Found member:', member)

    if (!member) {
      return NextResponse.json(
        { error: 'Member tidak ditemukan' },
        { status: 404 }
      )
    }

    const now = new Date()
    console.log('Current time:', now)
    let jenisAkses = ''
    let finalVisit = null

    if (member.accessType === 'VISIT') {
      jenisAkses = 'Paket Visit'
      console.log('Member is using VISIT access')
      
      // Gunakan transaksi untuk memastikan semua operasi berhasil atau gagal bersama
      const result = await prisma.$transaction(async (tx) => {
        // Cari pembayaran VISIT yang belum dipakai
        const paymentToUse = await tx.payment.findFirst({
          where: {
            memberId: memberId,
            type: 'VISIT',
            status: 'PAID',
            isVisitUsed: false,
          },
          orderBy: { createdAt: 'desc' },
        })
        console.log('Found payment in transaction:', paymentToUse)

        if (!paymentToUse) {
          throw new Error('Tidak ada pembayaran visit yang tersedia')
        }

        if (!member.accessStart || !member.accessEnd) {
          throw new Error('Akses visit tidak valid')
        }

        const start = new Date(member.accessStart)
        const end = new Date(member.accessEnd)
        const isValid = now >= start && now <= end
        console.log('Visit validity check:', { isValid, start, end, now })

        if (!isValid) {
          throw new Error('Akses visit sudah tidak aktif')
        }

        // Cari Visit PENDING
        const visitToUpdate = await tx.visit.findFirst({
          where: {
            memberId: memberId,
            checkInStatus: 'PENDING'
          },
          orderBy: { createdAt: 'desc' }
        })
        console.log('Found pending visit in transaction:', visitToUpdate)

        if (!visitToUpdate) {
          throw new Error('Tidak ada kunjungan pending yang ditemukan')
        }
        
        // Update visit menjadi CHECKED_IN
        const updatedVisit = await tx.visit.update({
          where: { id: visitToUpdate.id },
          data: {
            checkInStatus: 'CHECKED_IN',
            notes: `${visitToUpdate.notes || ''} | Check-in via QR Code`,
          }
        })
        console.log('Updated visit to checked in:', updatedVisit)

        // Tandai payment sebagai dipakai
        await tx.payment.update({
          where: { id: paymentToUse.id },
          data: { isVisitUsed: true },
        })
        console.log('Updated payment to used')
        
        return updatedVisit
      })
      
      finalVisit = result
    } else {
      // Untuk membership bulanan - buat Visit baru dengan status CHECKED_IN
      const isExpired = member.membershipEnd && member.membershipEnd < now
      const isValid = member.isActive && !isExpired
      jenisAkses = 'Membership'
      console.log('Membership validity check:', { isExpired, isActive: member.isActive, isValid })

      if (!isValid) {
        return NextResponse.json(
          { error: 'Membership sudah tidak aktif' },
          { status: 403 }
        )
      }

      finalVisit = await prisma.visit.create({
        data: {
          memberId: memberId,
          checkInStatus: 'CHECKED_IN',
          visitDate: now,
          notes: `Check-in via QR Code (${jenisAkses})`,
        }
      })
      console.log('Created visit for membership:', finalVisit)
    }

    console.log('=== SCAN API SUCCESS ===')
    return NextResponse.json({
      success: true,
      visit: finalVisit,
      memberName: member.name,
      jenisAkses,
    })

  } catch (error) {
    console.error('=== SCAN API ERROR ===')
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal mencatat kunjungan' },
      { status: error instanceof Error && (error.message.includes('tidak ditemukan') || error.message.includes('tidak aktif')) ? 400 : 500 }
    )
  }
}

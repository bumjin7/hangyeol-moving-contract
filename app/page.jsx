'use client'

import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
const STORAGE_KEY = 'hangyeol-moving-contracts-v1'

export const phoneFormatTestCases = [
  { input: '01012341234', expected: '010-1234-1234' },
  { input: '010-1234-1234', expected: '010-1234-1234' },
  { input: '010abc1234', expected: '010-1234' },
  { input: '0101234', expected: '010-1234' },
  { input: '010123456789', expected: '010-1234-5678' },
]

export const icsEscapeTestCases = [
  { input: '서울, 경기; 메모', expected: '서울\\, 경기\\; 메모' },
  { input: '1층\\2층', expected: '1층\\\\2층' },
  { input: '첫줄\n둘째줄', expected: '첫줄\\n둘째줄' },
]

function formatPhoneNumber(value) {
  const numbers = String(value || '').replace(/\D/g, '').slice(0, 11)

  if (numbers.length < 4) return numbers
  if (numbers.length < 8) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
}

function createIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

async function copyTextFallback(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // textarea fallback below
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }

  document.body.removeChild(textarea)
  return copied
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: '#111827', fontSize: 16, fontWeight: 700 }}>{label}</label>
      {children}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: 12,
    color: '#111827',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    maxWidth: 672,
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    color: '#111827',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: 900,
    textAlign: 'center',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 800,
    borderBottom: '1px solid #9ca3af',
    paddingBottom: 8,
    color: '#111827',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  grid2Small: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  input: {
    width: '100%',
    border: '1px solid #9ca3af',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
    background: '#ffffff',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    border: '1px solid #9ca3af',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
    background: '#ffffff',
    height: 96,
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    border: 'none',
    borderRadius: 16,
    padding: '16px 12px',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    borderTop: '1px solid #d1d5db',
    paddingTop: 16,
    lineHeight: 1.8,
  },
}

const optionNames = ['없음', '벽걸이 TV', '돌침대', '조립장농', '피아노', '날짜옵션', '이동거리', '이사작업지연', '보관비용', '기타']
const ADMIN_PASSWORD = '8210'

export default function MovingContractApp() {
  const contractRef = useRef(null)

  const bankName = '우리은행'
  const accountNumber = '1002-130-158228'
  const accountHolder = '정병국'

  const [baseCost, setBaseCost] = useState('')
  const [optionCost, setOptionCost] = useState('')
  const [ladderCost, setLadderCost] = useState('')
  const [depositCost, setDepositCost] = useState('')
  const [optionCount, setOptionCount] = useState(1)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [packingDate, setPackingDate] = useState('')
  const [moveDate, setMoveDate] = useState('')
  const [startHour, setStartHour] = useState('08')
  const [startMinute, setStartMinute] = useState('00')
  const [stopover, setStopover] = useState('')

  const [moveTypes, setMoveTypes] = useState([])
  const [storageDays, setStorageDays] = useState('1일')
  const [houseTypes, setHouseTypes] = useState([])
  const [workVolume, setWorkVolume] = useState('1톤')
  const [startCarryMethod, setStartCarryMethod] = useState('사다리차')
  const [startFloor, setStartFloor] = useState('1층')
  const [endCarryMethod, setEndCarryMethod] = useState('사다리차')
  const [endFloor, setEndFloor] = useState('1층')
  const [maleWorkers, setMaleWorkers] = useState('0명')
  const [femaleWorkers, setFemaleWorkers] = useState('0명')

  const [optionItems, setOptionItems] = useState([
    { name: '없음', price: '없음' },
    { name: '없음', price: '없음' },
    { name: '없음', price: '없음' },
    { name: '없음', price: '없음' },
  ])

  const [customerMemo, setCustomerMemo] = useState('')
  const [excludedItems, setExcludedItems] = useState('')
  const [etcMemo, setEtcMemo] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [pdfStatus, setPdfStatus] = useState('')
  const [savedContracts, setSavedContracts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [isSavedListOpen, setIsSavedListOpen] = useState(false)
  const [selectedContractId, setSelectedContractId] = useState(null)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminStatus, setAdminStatus] = useState('')

  const totalCost = (Number(baseCost) || 0) + (Number(optionCost) || 0) + (Number(ladderCost) || 0)
  const balanceCost = totalCost - (Number(depositCost) || 0)

  const toggleValue = (value, setter) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
  }

  const updateOptionItem = (index, field, value) => {
    setOptionItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const getVisibleOptionsText = (onlySelected = false) => {
    return optionItems
      .slice(0, optionCount)
      .filter((option) => !onlySelected || option.name !== '없음' || option.price !== '없음')
      .map((option, index) => `옵션 ${index + 1}: ${option.name || '없음'} / ${option.price || '없음'}`)
      .join('\n')
  }

  const buildContractText = () => {
    const visibleOptions = getVisibleOptionsText(true)

    return `이사 견적 계약 안내

【고객 정보】
고객명: ${customerName || '-'}
연락처: ${customerPhone || '-'}

【주소】
출발지: ${startAddress || '-'}
도착지: ${endAddress || '-'}
경유지: ${stopover || '-'}

【이사 일정】
포장일: ${packingDate || '-'}
운반일: ${moveDate || '-'}
시작시간: ${startHour}시 ${startMinute}분

【계약 정보】
계약상품: ${moveTypes.length ? moveTypes.join(', ') : '-'}
보관기간: ${moveTypes.includes('보관이사') ? storageDays : '-'}
작업용량: ${workVolume}
출발지 운반수단: ${startCarryMethod} / ${startFloor}
도착지 운반수단: ${endCarryMethod} / ${endFloor}
작업인원: 남 ${maleWorkers}, 여 ${femaleWorkers}

【옵션】
${visibleOptions || '-'}

【견적 금액】
기본 이사비용: ${baseCost || 0}만원
옵션 비용: ${optionCost || 0}만원
사다리차 비용: ${ladderCost || 0}만원
총 견적금액: ${totalCost}만원
계약금: ${depositCost || 0}만원
잔금: ${balanceCost}만원

【입금 계좌】
${bankName} ${accountNumber} (예금주: ${accountHolder})

【비고 및 요청사항】
고객 요청 및 주의사항: ${customerMemo || '-'}
견적 제외 품목: ${excludedItems || '-'}
기타 메모: ${etcMemo || '-'}`
  }

  const downloadICS = () => {
    if (!moveDate) {
      alert('운반일을 선택해 주세요.')
      return
    }

    const startDate = new Date(moveDate)
    startDate.setHours(Number(startHour), Number(startMinute), 0)

    const endDate = new Date(startDate)
    endDate.setHours(startDate.getHours() + 2)

    const icsDescription = [
      '【고객 정보】',
      `고객명: ${customerName || '-'}`,
      `연락처: ${customerPhone || '-'}`,
      '',
      '【주소 및 일정】',
      `출발지 주소: ${startAddress || '-'}`,
      `도착지 주소: ${endAddress || '-'}`,
      `포장일: ${packingDate || '-'}`,
      `운반일: ${moveDate || '-'}`,
      `시작시간: ${startHour}시 ${startMinute}분`,
      `경유지: ${stopover || '-'}`,
      '',
      '【계약 상품】',
      `계약 상품: ${moveTypes.length ? moveTypes.join(', ') : '-'}`,
      `보관 기간: ${moveTypes.includes('보관이사') ? storageDays : '-'}`,
      `주거 형태: ${houseTypes.length ? houseTypes.join(', ') : '-'}`,
      `작업 용량: ${workVolume}`,
      `출발지 운반수단: ${startCarryMethod} / ${startFloor}`,
      `도착지 운반수단: ${endCarryMethod} / ${endFloor}`,
      `남 작업인원: ${maleWorkers}`,
      `여 작업인원: ${femaleWorkers}`,
      '',
      '【옵션 및 추가비용】',
      getVisibleOptionsText() || '-',
      '',
      '【견적 금액】',
      `기본 이사비용: ${baseCost || 0}만원`,
      `옵션 비용: ${optionCost || 0}만원`,
      `사다리차 비용: ${ladderCost || 0}만원`,
      `총 견적 금액: ${totalCost}만원`,
      `계약금: ${depositCost || 0}만원`,
      `잔금: ${balanceCost}만원`,
    ].join('\n')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Moving Contract App//KR
BEGIN:VEVENT
SUMMARY:${escapeIcsText(`${customerName || '고객'} 이사 일정 ${customerPhone ? `(${customerPhone})` : ''}`)}
DTSTART:${createIcsDate(startDate)}
DTEND:${createIcsDate(endDate)}
LOCATION:${escapeIcsText(`${startAddress} → ${endAddress}`)}
CONTACT:${escapeIcsText(customerPhone || '')}
DESCRIPTION:${escapeIcsText(icsDescription)}
END:VEVENT
END:VCALENDAR`

    downloadTextFile(`${customerName || '이사일정'}.ics`, icsContent, 'text/calendar;charset=utf-8')
  }

  const getSelectedOptionLabels = () => {
    const names = optionItems
      .slice(0, optionCount)
      .filter((option) => option.name && option.name !== '없음')
      .map((option) => option.name)

    return names.length ? Array.from(new Set(names)).join(', ') : '없음'
  }

  const escapeHtml = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const waitForImagesInElement = async (element) => {
    const images = Array.from(element.querySelectorAll('img'))

    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve()

        return new Promise((resolve) => {
          img.onload = resolve
          img.onerror = resolve
        })
      }),
    )
  }

  const buildStyledContractElement = () => {
    const target = document.createElement('div')
    target.style.position = 'fixed'
    target.style.left = '-10000px'
    target.style.top = '0'
    target.style.width = '900px'
    target.style.background = '#ffffff'
    target.style.borderRadius = '24px'
    target.style.overflow = 'hidden'
    target.style.fontFamily = `'Pretendard', 'SUIT', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`
    target.style.color = '#111827'
    target.style.boxShadow = '0 10px 40px rgba(0,0,0,0.12)'

    const today = new Date().toLocaleDateString('ko-KR')

    const customerNameText = escapeHtml(customerName || '')
    const customerPhoneText = escapeHtml(customerPhone || '')
    const startAddressText = escapeHtml(startAddress || '')
    const endAddressText = escapeHtml(endAddress || '')
    const packingDateText = escapeHtml(packingDate || '')
    const startTimeText = packingDate ? `${escapeHtml(startHour)}시 ${escapeHtml(startMinute)}분` : ''
    const moveTypesText = escapeHtml(moveTypes.length ? moveTypes.join(', ') : '')
    const workVolumeText = escapeHtml(workVolume || '')
    const maleWorkersText = escapeHtml(maleWorkers || '')
    const femaleWorkersText = escapeHtml(femaleWorkers || '')
    const carryText = escapeHtml(
      `출발지 - ${startCarryMethod || '-'}${startFloor ? `(${startFloor})` : ''}
도착지 - ${endCarryMethod || '-'}${endFloor ? `(${endFloor})` : ''}`,
    )
    const optionsText = escapeHtml(getSelectedOptionLabels())
    const requestText = escapeHtml(customerMemo || '')
    const excludedText = escapeHtml(excludedItems || '')
    const etcMemoText = escapeHtml(etcMemo || '')

    const baseCostText = Number(baseCost || 0).toLocaleString()
    const optionCostText = Number(optionCost || 0).toLocaleString()
    const ladderCostText = Number(ladderCost || 0).toLocaleString()
    const totalCostText = Number(totalCost || 0).toLocaleString()
    const depositCostText = Number(depositCost || 0).toLocaleString()

    const addressHtml = (value) => {
      const text = String(value || '')
      if (!text) return '&nbsp;'

      const fontSize = text.length >= 32 ? 13.5 : text.length >= 24 ? 14.5 : 16
      return `<span style="font-size:${fontSize}px;line-height:1.45;word-break:break-word;">${escapeHtml(text)}</span>`
    }

    const customerRows = [
      ['고객명', customerNameText || '&nbsp;'],
      ['연락처', customerPhoneText || '&nbsp;'],
      ['출발지', addressHtml(startAddress)],
      ['도착지', addressHtml(endAddress)],
      ['이사일시', packingDateText ? `${packingDateText}${startTimeText ? ` / ${startTimeText}` : ''}` : '&nbsp;'],
    ]

    const requestDetail =
      `${requestText ? `고객요청 : ${requestText}` : ''}` +
      `${requestText && excludedText ? '<br />' : ''}` +
      `${excludedText ? `견적제외품목 : ${excludedText}` : ''}` +
      `${etcMemoText ? `${requestText || excludedText ? '<br />' : ''}기타메모 : ${etcMemoText}` : ''}`

    const contractRows = [
      ...(moveTypes.length ? [['계약상품', moveTypesText]] : []),
      ...(workVolumeText ? [['작업용량', workVolumeText]] : []),
      ...((startCarryMethod || endCarryMethod) ? [['운반수단', carryText]] : []),
      ...((maleWorkers !== '0명' || femaleWorkers !== '0명')
        ? [['작업인원', `남자 ${maleWorkersText || '0명'} / 여자 ${femaleWorkersText || '0명'}`]]
        : []),
      ...(optionsText && optionsText !== '없음' ? [['옵션내용', optionsText]] : []),
      ...(requestDetail ? [['비고 및 요청사항', requestDetail]] : []),
    ]

    const rowHtml = (label, value, isLast = false) => {
      const valueFontSize = label === '운반수단' ? 14 : 16

      return `
      <div style="
        display:grid;
        grid-template-columns:118px 1fr;
        align-items:stretch;
        border-bottom:${isLast ? 'none' : '1px solid #d9e3e6'};
        min-height:48px;
      ">
        <div style="
          display:flex;
          align-items:center;
          padding:12px 14px;
          border-right:1px solid #d9e3e6;
          font-size:16px;
          font-weight:900;
          color:#0f8f8a;
          background:#fbffff;
        ">${label}</div>
        <div style="
          display:flex;
          align-items:center;
          padding:12px 16px;
          font-size:${valueFontSize}px;
          font-weight:800;
          color:#111827;
          line-height:${label === '운반수단' ? '1.55' : '1.65'};
          word-break:break-word;
          white-space:pre-wrap;
        ">${value}</div>
      </div>
    `
    }

    const buildRowsHtml = (rows) =>
      rows.map((row, index) => rowHtml(row[0], row[1], index === rows.length - 1)).join('')

    const iconImgHtml = (src, alt, size = 34) => `
      <img
        src="${src}"
        alt="${alt}"
        style="
          width:${size}px;
          height:${size}px;
          object-fit:contain;
          display:block;
          flex-shrink:0;
        "
      />
    `

    const sectionTitleHtml = (iconSrc, title) => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;height:34px;">
          <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${iconImgHtml(iconSrc, title, 32)}
          </div>
          <div style="
            height:32px;
            display:flex;
            align-items:center;
            font-size:24px;
            font-weight:900;
            color:#0f766e;
            line-height:1;
            padding-top:1px;
          ">${title}</div>
        </div>
        <div style="height:2px;background:#0f9f9a;margin-top:12px;border-radius:999px;"></div>
      </div>
    `

    const smallSectionTitleHtml = (iconSrc, title) => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;height:24px;">
          <div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${iconImgHtml(iconSrc, title, 22)}
          </div>
          <div style="
            height:22px;
            display:flex;
            align-items:center;
            font-size:17px;
            font-weight:900;
            color:#0f766e;
            line-height:1;
            padding-top:1px;
          ">${title}</div>
        </div>
        <div style="height:2px;background:#0f9f9a;margin-top:10px;border-radius:999px;"></div>
      </div>
    `

    target.innerHTML = `
      <div style="
        position:relative;
        overflow:hidden;
        background:#ffffff;
        padding:0 40px 0 40px;
      ">
        <div style="
          position:relative;
          z-index:2;
          margin:0 -40px 28px -40px;
          background:#ffffff;
          padding:14px 32px 8px 32px;
          border-bottom:3px solid #169fe6;
          box-sizing:border-box;
        ">
          <img
            src="/header-logo.png"
            alt="한결이사 상단 로고"
            style="
              width:100%;
              height:150px;
              object-fit:contain;
              display:block;
            "
          />
        </div>

        <div style="
          position:relative;
          z-index:2;
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:18px;
          margin-bottom:22px;
        ">
          <div style="padding-top:8px;margin-left:70px;">
            <div style="font-size:34px;font-weight:900;letter-spacing:-1px;color:#0b4a7e;line-height:1.15;">이사계약서</div>
            <div style="margin-top:7px;font-size:13px;font-weight:800;color:#169fe6;">고객의 새로운 시작을 한결같이, 한결이사가 함께합니다.</div>
          </div>

          <div style="
            min-width:230px;
            border:1px solid #9ceee2;
            border-radius:14px;
            background:#ffffff;
            overflow:hidden;
          ">
            <div style="display:grid;grid-template-columns:82px 1fr;border-bottom:1px solid #d9e3e6;height:44px;">
              <div style="display:flex;align-items:center;justify-content:flex-start;height:44px;line-height:1;padding:0 14px;color:#0f8f8a;font-size:15px;font-weight:900;border-right:1px solid #d9e3e6;box-sizing:border-box;">담당자</div>
              <div style="display:flex;align-items:center;justify-content:flex-start;height:44px;line-height:1;padding:0 14px;color:#111827;font-size:15px;font-weight:900;text-align:left;box-sizing:border-box;">정병국</div>
            </div>
            <div style="display:grid;grid-template-columns:82px 1fr;height:44px;">
              <div style="display:flex;align-items:center;justify-content:flex-start;height:44px;line-height:1;padding:0 14px;color:#0f8f8a;font-size:15px;font-weight:900;border-right:1px solid #d9e3e6;box-sizing:border-box;">계약일자</div>
              <div style="display:flex;align-items:center;justify-content:flex-start;height:44px;line-height:1;padding:0 14px;color:#111827;font-size:15px;font-weight:900;text-align:left;box-sizing:border-box;">${today}</div>
            </div>
          </div>
        </div>

        <div style="
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:18px;
          margin-bottom:20px;
        ">
          <div>
            ${sectionTitleHtml('/icon-customer.png', '고객 정보')}
            <div style="
              border:1px solid #bff3ea;
              border-radius:10px;
              background:#ffffff;
              overflow:hidden;
            ">
              ${buildRowsHtml(customerRows)}
            </div>
          </div>

          <div>
            ${sectionTitleHtml('/icon-contract.png', '계약 정보')}
            <div style="
              border:1px solid #bff3ea;
              border-radius:10px;
              background:#ffffff;
              overflow:hidden;
            ">
              ${buildRowsHtml(contractRows)}
            </div>
          </div>
        </div>

        <div style="
          position:relative;
          z-index:1;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:18px;
          margin-bottom:20px;
        ">
          <div>
            ${sectionTitleHtml('/icon-price.png', '견적 금액')}
            <div style="
              border:1px solid #9ceee2;
              border-radius:10px;
              background:#ffffff;
              padding:18px 20px;
              overflow:hidden;
            ">

            <div style="
              display:flex;
              align-items:baseline;
              gap:10px;
              margin-bottom:18px;
            ">
              <div style="
                font-size:23px;
                font-weight:900;
                color:#0f766e;
              ">총 견적금액</div>
              <div style="
                font-size:24px;
                font-weight:900;
                color:#14b8a6;
              ">${totalCostText}만원</div>
            </div>

            <div style="
              display:flex;
              flex-direction:column;
              font-size:16px;
              font-weight:900;
              color:#111827;
              border-top:1px solid #d9e3e6;
            ">
              <div style="display:grid;grid-template-columns:130px 1fr;border-bottom:1px solid #d9e3e6;padding:9px 0;"><div>기본 이사비용</div><div>${baseCostText}만원</div></div>
              <div style="display:grid;grid-template-columns:130px 1fr;border-bottom:1px solid #d9e3e6;padding:9px 0;"><div>옵션비용</div><div>${optionCostText}만원</div></div>
              <div style="display:grid;grid-template-columns:130px 1fr;border-bottom:1px solid #d9e3e6;padding:9px 0;"><div>사다리차비용</div><div>${ladderCostText}만원</div></div>
              <div style="display:grid;grid-template-columns:130px 1fr;padding:9px 0;"><div>총 합계</div><div>${totalCostText}만원</div></div>
            </div>
          </div>
          </div>

          <div>
            ${sectionTitleHtml('/icon-bank.png', '계약금 입금 계좌')}
            <div style="
              background:#ffffff;
              padding:0;
              overflow:visible;
            ">

            <div style="
              border:1px solid #d9e3e6;
              border-radius:8px;
              overflow:hidden;
              font-size:18px;
              font-weight:900;
              color:#111827;
              line-height:1.7;
            ">
              <div style="display:grid;grid-template-columns:110px 1fr;border-bottom:1px solid #d9e3e6;min-height:44px;"><div style="display:flex;align-items:center;padding:8px 12px;color:#0f766e;border-right:1px solid #d9e3e6;background:#fbffff;">은행</div><div style="display:flex;align-items:center;padding:8px 14px;">${escapeHtml(bankName)}</div></div>
              <div style="display:grid;grid-template-columns:110px 1fr;border-bottom:1px solid #d9e3e6;min-height:44px;"><div style="display:flex;align-items:center;padding:8px 12px;color:#0f766e;border-right:1px solid #d9e3e6;background:#fbffff;">계좌번호</div><div style="display:flex;align-items:center;padding:8px 14px;">${escapeHtml(accountNumber)}</div></div>
              <div style="display:grid;grid-template-columns:110px 1fr;border-bottom:1px solid #d9e3e6;min-height:44px;"><div style="display:flex;align-items:center;padding:8px 12px;color:#0f766e;border-right:1px solid #d9e3e6;background:#fbffff;">예금주</div><div style="display:flex;align-items:center;padding:8px 14px;">${escapeHtml(accountHolder)}</div></div>
              <div style="display:grid;grid-template-columns:110px 1fr;min-height:44px;"><div style="display:flex;align-items:center;padding:8px 12px;color:#0f766e;border-right:1px solid #d9e3e6;background:#fbffff;">계약금</div><div style="display:flex;align-items:center;padding:8px 14px;">${depositCostText}만원</div></div>
            </div>

            <div style="
              margin-top:12px;
              font-size:14px;
              font-weight:900;
              color:#dc2626;
            ">
              ※ 카드 결제 및 현금영수증 발행 시 부가세 별도
            </div>
          </div>
        </div>


        <div style="position:relative;z-index:1;margin-bottom:20px;">
          ${smallSectionTitleHtml('/icon-terms.png', '계약 조건 및 특약 사항')}
          <div style="
            border:1px solid #d1d5db;
            border-radius:10px;
            background:#fafafa;
            padding:16px 18px;
            box-sizing:border-box;
          ">
            <div style="
              display:flex;
              flex-direction:column;
              gap:8px;
              font-size:11.5px;
              font-weight:500;
              line-height:1.65;
              color:#111827;
              word-break:break-word;
            ">
              <div>• 이사 당일 추가 짐 또는 차량이 추가로 필요 시 비용이 발생할 수 있습니다.</div>
              <div>• 고객 사정으로 인한 일정 변경 및 취소는 최소 3일 전까지 연락 주세요.</div>
              <div>• 귀중품 및 현금은 고객님이 직접 관리해 주시기 바랍니다.</div>
              <div>• 계약서 작성 후 계약금을 입금하시면 예약이 확정됩니다.</div>
              <div>• 잔금은 이사가 끝나고 고객 확인 후 지불해 주시면 됩니다.</div>
              <div>• 본 계약서는 쌍방 합의하에 작성되었으며, 계약 내용을 성실히 이행할 것을 약정합니다.</div>
            </div>
          </div>
        </div>

        <div style="position:relative;z-index:1;margin-bottom:26px;">
          ${smallSectionTitleHtml('/icon-moving-day.png', '이사당일 준비사항')}
          <div style="
            border:1px solid #d1d5db;
            border-radius:10px;
            background:#ffffff;
            padding:16px 18px;
            box-sizing:border-box;
          ">
            <div style="
              display:flex;
              flex-direction:column;
              gap:8px;
              font-size:11.5px;
              font-weight:500;
              line-height:1.7;
              color:#111827;
              word-break:break-word;
            ">
              <div>• 고객님 이사 시작 전 차키, 핸드폰, 지갑, 서류, 귀중품 등은 미리 챙겨 주세요.</div>
              <div>• 생활 쓰레기, 버릴 음식물, 재활용품은 가능하면 미리 처리해 주세요.</div>
              <div>• 두고 가야 할 물건이 있으면 미리 말씀해 주세요.</div>
              <div>• 포장 완료 후 집 안에 두고 가는 물건이 없는지 꼭 확인해 주세요.</div>
            </div>
          </div>
        </div>

        <div style="margin:0 -40px 0 -40px;padding:18px 40px 20px 40px;background:#f3fbff;border-top:2px solid #169fe6;text-align:center;">
          <div style="font-size:16px;font-weight:900;color:#0b4a7e;">한결같은 마음으로 안전하고 편안한 이사를 약속드립니다.</div>
          <div style="margin-top:5px;font-size:12px;font-weight:700;color:#4b6b82;">한결이사</div>
        </div>
      </div>
    `

    document.body.appendChild(target)
    return target
  }

  const buildTextContractPages = () => {
    const page = buildStyledContractElement()
    return { wrapper: page, pages: [page] }
  }

  const handleImageDownload = async () => {
    setPdfStatus('이미지 파일 생성 중입니다. 잠시만 기다려 주세요.')
    let imageTarget = null

    try {
      if (document.fonts?.ready) await document.fonts.ready

      imageTarget = buildStyledContractElement()
      await waitForImagesInElement(imageTarget)

      const canvas = await html2canvas(imageTarget, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      })

      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `${customerName || '고객'}_이사계약서.png`
      link.click()

      setPdfStatus('이미지 파일이 생성되었습니다.')
    } catch (error) {
      console.error('이미지 생성 오류:', error)
      setPdfStatus('이미지 저장에 실패했습니다. 앱 이미지 파일을 확인해 주세요.')
    } finally {
      if (imageTarget) imageTarget.remove()
    }
  }

  const handlePdfDownload = async () => {
    setPdfStatus('PDF 파일 생성 중입니다. 잠시만 기다려 주세요.')
    let result = null

    try {
      if (document.fonts?.ready) await document.fonts.ready

      result = buildTextContractPages()
      const page = result.pages[0]

      await waitForImagesInElement(page)

      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const margin = 6
      const maxWidth = pageWidth - margin * 2
      const maxHeight = pageHeight - margin * 2

      let renderWidth = maxWidth
      let renderHeight = (canvas.height * renderWidth) / canvas.width

      if (renderHeight > maxHeight) {
        renderHeight = maxHeight
        renderWidth = (canvas.width * renderHeight) / canvas.height
      }

      const imgData = canvas.toDataURL('image/png')
      const x = (pageWidth - renderWidth) / 2
      const y = (pageHeight - renderHeight) / 2

      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight)
      pdf.save(`${customerName || '고객'}_이사계약서.pdf`)

      setPdfStatus('PDF 파일이 생성되었습니다.')
    } catch (error) {
      console.error('PDF 생성 오류:', error)
      setPdfStatus('PDF 저장에 실패했습니다. 앱 이미지 파일을 확인해 주세요.')
    } finally {
      if (result?.wrapper) result.wrapper.remove()
    }
  }

  const shareContract = async () => {
    const shareText = buildContractText()
    setShareStatus('')

    try {
      if (navigator.share && window.isSecureContext) {
        await navigator.share({ title: '이사 견적 계약 안내', text: shareText })
        setShareStatus('공유창을 열었습니다.')
        return
      }
    } catch (error) {
      console.warn('navigator.share failed, falling back to clipboard:', error)
    }

    const copied = await copyTextFallback(shareText)

    if (copied) {
      setShareStatus('계약 안내문이 복사되었습니다. 카카오톡에 붙여넣어 주세요.')
      alert('계약 안내문이 복사되었습니다. 카카오톡에 붙여넣어 주세요.')
    } else {
      setShareStatus('자동 공유가 차단되었습니다. 내용을 직접 복사해 주세요.')
      alert('자동 공유가 차단되었습니다. 브라우저 주소창이 https인지 확인하거나 내용을 직접 복사해 주세요.')
    }
  }

  const readAllContracts = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('로컬 계약서 읽기 오류:', error)
      return []
    }
  }

  const writeAllContracts = (contracts) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
  }

  const saveContract = async () => {
    setSaveStatus('계약서 저장 중입니다...')

    try {
      const contractData = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        customerName,
        customerPhone,
        startAddress,
        endAddress,
        packingDate,
        moveDate,
        startHour,
        startMinute,
        stopover,
        moveTypes,
        storageDays,
        houseTypes,
        workVolume,
        startCarryMethod,
        startFloor,
        endCarryMethod,
        endFloor,
        maleWorkers,
        femaleWorkers,
        optionItems,
        baseCost,
        optionCost,
        ladderCost,
        depositCost,
        totalCost,
        balanceCost,
        customerMemo,
        excludedItems,
        etcMemo,
        createdAt: new Date().toISOString(),
        isDeleted: false,
      }

      const allContracts = readAllContracts()
      writeAllContracts([contractData, ...allContracts])
      setSaveStatus('계약서가 이 휴대폰에 저장되었습니다.')
      await loadContracts()
    } catch (error) {
      console.error('계약서 저장 오류:', error)
      setSaveStatus('계약서 저장에 실패했습니다. 브라우저 저장공간을 확인해 주세요.')
    }
  }

  const loadContracts = async () => {
    try {
      const list = readAllContracts()
        .filter((item) => !item.isDeleted)
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      setSavedContracts(list)
    } catch (error) {
      console.error('계약서 조회 오류:', error)
    }
  }

  const enterAdminMode = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminMode(true)
      setAdminPasswordInput('')
      setAdminStatus('관리자 모드가 켜졌습니다.')
      return
    }

    setAdminStatus('비밀번호가 맞지 않습니다.')
  }

  const exitAdminMode = () => {
    setIsAdminMode(false)
    setAdminPasswordInput('')
    setAdminStatus('관리자 모드가 꺼졌습니다.')
  }

  const softDeleteContract = async (item) => {
    const firstConfirm = window.confirm(`정말 삭제하시겠습니까?\n\n고객명: ${item.customerName || '고객명 없음'}\n연락처: ${item.customerPhone || '연락처 없음'}\n\n삭제 후 일반 목록에서는 보이지 않습니다.`)
    if (!firstConfirm) return

    const typed = window.prompt('실수 방지를 위해 "삭제" 라고 입력해 주세요.')
    if (typed !== '삭제') {
      setAdminStatus('삭제가 취소되었습니다. 정확히 "삭제" 라고 입력해야 합니다.')
      return
    }

    try {
      const allContracts = readAllContracts()
      const updated = allContracts.map((contract) =>
        contract.id === item.id
          ? { ...contract, isDeleted: true, deletedAt: new Date().toISOString() }
          : contract,
      )
      writeAllContracts(updated)

      setAdminStatus('계약서가 이 휴대폰에서 삭제 처리되었습니다.')
      if (selectedContractId === item.id) setSelectedContractId(null)
      await loadContracts()
    } catch (error) {
      console.error('계약서 삭제 오류:', error)
      setAdminStatus('삭제 처리에 실패했습니다.')
    }
  }

  const loadContractToForm = (item) => {
    setCustomerName(item.customerName || '')
    setCustomerPhone(item.customerPhone || '')
    setStartAddress(item.startAddress || '')
    setEndAddress(item.endAddress || '')
    setPackingDate(item.packingDate || '')
    setMoveDate(item.moveDate || '')
    setStartHour(item.startHour || '08')
    setStartMinute(item.startMinute || '00')
    setStopover(item.stopover || '')
    setMoveTypes(item.moveTypes || [])
    setStorageDays(item.storageDays || '1일')
    setHouseTypes(item.houseTypes || [])
    setWorkVolume(item.workVolume || '1톤')
    setStartCarryMethod(item.startCarryMethod || '사다리차')
    setStartFloor(item.startFloor || '1층')
    setEndCarryMethod(item.endCarryMethod || '사다리차')
    setEndFloor(item.endFloor || '1층')
    setMaleWorkers(item.maleWorkers || '0명')
    setFemaleWorkers(item.femaleWorkers || '0명')
    setOptionItems(item.optionItems || [
      { name: '없음', price: '없음' },
      { name: '없음', price: '없음' },
      { name: '없음', price: '없음' },
      { name: '없음', price: '없음' },
    ])
    setBaseCost(item.baseCost || '')
    setOptionCost(item.optionCost || '')
    setLadderCost(item.ladderCost || '')
    setDepositCost(item.depositCost || '')
    setCustomerMemo(item.customerMemo || '')
    setExcludedItems(item.excludedItems || '')
    setEtcMemo(item.etcMemo || '')
    setSaveStatus('저장된 계약서를 불러왔습니다.')
  }

  const filteredContracts = savedContracts.filter((item) => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return true

    return [item.customerName, item.customerPhone, item.startAddress, item.endAddress, item.moveDate]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  })

  const buildSavedContractDetailText = (item) => {
    const savedOptions = (item.optionItems || [])
      .filter((option) => option.name !== '없음' || option.price !== '없음')
      .map((option, index) => `옵션 ${index + 1}: ${option.name || '없음'} / ${option.price || '없음'}`)
      .join('\n')

    return [
      '【고객 정보】',
      `고객명: ${item.customerName || '-'}`,
      `연락처: ${item.customerPhone || '-'}`,
      '',
      '【주소 및 일정】',
      `출발지: ${item.startAddress || '-'}`,
      `도착지: ${item.endAddress || '-'}`,
      `경유지: ${item.stopover || '-'}`,
      `포장일: ${item.packingDate || '-'}`,
      `운반일: ${item.moveDate || '-'}`,
      `시작시간: ${item.startHour || '08'}시 ${item.startMinute || '00'}분`,
      '',
      '【계약 정보】',
      `계약상품: ${item.moveTypes?.length ? item.moveTypes.join(', ') : '-'}`,
      `보관기간: ${item.moveTypes?.includes('보관이사') ? item.storageDays : '-'}`,
      `주거형태: ${item.houseTypes?.length ? item.houseTypes.join(', ') : '-'}`,
      `작업용량: ${item.workVolume || '-'}`,
      `출발지 운반수단: ${item.startCarryMethod || '-'} / ${item.startFloor || '-'}`,
      `도착지 운반수단: ${item.endCarryMethod || '-'} / ${item.endFloor || '-'}`,
      `작업인원: 남 ${item.maleWorkers || '0명'}, 여 ${item.femaleWorkers || '0명'}`,
      '',
      '【옵션 및 추가비용】',
      savedOptions || '-',
      '',
      '【견적 금액】',
      `기본 이사비용: ${item.baseCost || 0}만원`,
      `옵션 비용: ${item.optionCost || 0}만원`,
      `사다리차 비용: ${item.ladderCost || 0}만원`,
      `총 견적금액: ${item.totalCost || 0}만원`,
      `계약금: ${item.depositCost || 0}만원`,
      `잔금: ${item.balanceCost || 0}만원`,
      '',
      '【비고 및 요청사항】',
      `고객 요청 및 주의사항: ${item.customerMemo || '-'}`,
      `견적 제외 품목: ${item.excludedItems || '-'}`,
      `기타 메모: ${item.etcMemo || '-'}`,
    ].join('\n')
  }

  useEffect(() => {
    loadContracts()
  }, [])

  const moneyFields = [
    ['기본 이사비용', baseCost, setBaseCost, false],
    ['옵션 비용', optionCost, setOptionCost, false],
    ['총 견적 금액', totalCost, null, true],
    ['사다리차 비용', ladderCost, setLadderCost, false],
    ['계약금', depositCost, setDepositCost, false],
    ['잔금', balanceCost, null, true],
  ]

  return (
    <div style={styles.page}>
      <div ref={contractRef} style={styles.card}>
        <h1 style={styles.title}>한결이사 · 이사 견적 계약서</h1>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>고객 정보</h2>
          <div style={styles.grid2}>
            <Field label="고객명"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={styles.input} placeholder="고객명" /></Field>
            <Field label="연락처"><input type="tel" inputMode="numeric" value={customerPhone} onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))} style={styles.input} placeholder="010-0000-0000" /></Field>
          </div>
          <div style={styles.grid2}>
            <Field label="출발지 주소"><input value={startAddress} onChange={(e) => setStartAddress(e.target.value)} style={styles.input} placeholder="출발지 주소" /></Field>
            <Field label="도착지 주소"><input value={endAddress} onChange={(e) => setEndAddress(e.target.value)} style={styles.input} placeholder="도착지 주소" /></Field>
          </div>
          <div style={styles.grid2}>
            <Field label="포장일"><input type="date" value={packingDate} onChange={(e) => setPackingDate(e.target.value)} style={styles.input} /></Field>
            <Field label="운반일"><input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} style={styles.input} /></Field>
          </div>
          <div style={styles.grid2}>
            <Field label="시작 시간">
              <div style={styles.grid2Small}>
                <select value={startHour} onChange={(e) => setStartHour(e.target.value)} style={styles.input}>
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={String(hour).padStart(2, '0')}>{String(hour).padStart(2, '0')}시</option>)}
                </select>
                <select value={startMinute} onChange={(e) => setStartMinute(e.target.value)} style={styles.input}>
                  {[0, 10, 20, 30, 40, 50].map((minute) => <option key={minute} value={String(minute).padStart(2, '0')}>{String(minute).padStart(2, '0')}분</option>)}
                </select>
              </div>
            </Field>
            <Field label="경유지"><input value={stopover} onChange={(e) => setStopover(e.target.value)} style={styles.input} placeholder="경유지" /></Field>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>계약 상품</h2>
          <div style={{ ...styles.grid2, fontSize: 16, fontWeight: 700 }}>
            <label><input type="checkbox" checked={moveTypes.includes('포장이사')} onChange={() => toggleValue('포장이사', setMoveTypes)} /> 포장이사</label>
            <label><input type="checkbox" checked={moveTypes.includes('일반이사')} onChange={() => toggleValue('일반이사', setMoveTypes)} /> 일반이사</label>
            <label><input type="checkbox" checked={moveTypes.includes('반포장이사')} onChange={() => toggleValue('반포장이사', setMoveTypes)} /> 반포장이사</label>
            <label><input type="checkbox" checked={moveTypes.includes('사무실이사')} onChange={() => toggleValue('사무실이사', setMoveTypes)} /> 사무실이사</label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontWeight: 700 }}>
            <label><input type="checkbox" checked={moveTypes.includes('보관이사')} onChange={() => toggleValue('보관이사', setMoveTypes)} /> 보관이사</label>
            <select value={storageDays} onChange={(e) => setStorageDays(e.target.value)} style={{ ...styles.input, width: 120 }}>
              {Array.from({ length: 365 }, (_, i) => <option key={i + 1}>{i + 1}일</option>)}
            </select>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>주거 형태</h3>
          <div style={{ ...styles.grid2, fontSize: 16, fontWeight: 700 }}>
            <label><input type="checkbox" checked={houseTypes.includes('아파트')} onChange={() => toggleValue('아파트', setHouseTypes)} /> 아파트</label>
            <label><input type="checkbox" checked={houseTypes.includes('빌라')} onChange={() => toggleValue('빌라', setHouseTypes)} /> 빌라</label>
            <label><input type="checkbox" checked={houseTypes.includes('오피스텔/원룸')} onChange={() => toggleValue('오피스텔/원룸', setHouseTypes)} /> 오피스텔/원룸</label>
            <label><input type="checkbox" checked={houseTypes.includes('다세대/단독')} onChange={() => toggleValue('다세대/단독', setHouseTypes)} /> 다세대/단독</label>
            <label><input type="checkbox" checked={houseTypes.includes('상가')} onChange={() => toggleValue('상가', setHouseTypes)} /> 상가</label>
          </div>

          <Field label="작업 용량">
            <select value={workVolume} onChange={(e) => setWorkVolume(e.target.value)} style={styles.input}>
              <option>1톤</option><option>2.5톤</option><option>5톤</option><option>6톤</option><option>7.5톤</option><option>7.5톤 이상</option>
            </select>
          </Field>

          <div style={styles.grid2}>
            <Field label="출발지 운반수단">
              <div style={styles.grid2Small}>
                <select value={startCarryMethod} onChange={(e) => setStartCarryMethod(e.target.value)} style={styles.input}><option>사다리차</option><option>엘레베이터</option><option>계단작업</option></select>
                <select value={startFloor} onChange={(e) => setStartFloor(e.target.value)} style={styles.input}>{Array.from({ length: 100 }, (_, i) => <option key={i + 1}>{i + 1}층</option>)}</select>
              </div>
            </Field>
            <Field label="도착지 운반수단">
              <div style={styles.grid2Small}>
                <select value={endCarryMethod} onChange={(e) => setEndCarryMethod(e.target.value)} style={styles.input}><option>사다리차</option><option>엘레베이터</option><option>계단작업</option></select>
                <select value={endFloor} onChange={(e) => setEndFloor(e.target.value)} style={styles.input}>{Array.from({ length: 100 }, (_, i) => <option key={i + 1}>{i + 1}층</option>)}</select>
              </div>
            </Field>
          </div>

          <div style={styles.grid2}>
            <Field label="남 작업인원"><select value={maleWorkers} onChange={(e) => setMaleWorkers(e.target.value)} style={styles.input}>{Array.from({ length: 11 }, (_, i) => <option key={i}>{i}명</option>)}</select></Field>
            <Field label="여 작업인원"><select value={femaleWorkers} onChange={(e) => setFemaleWorkers(e.target.value)} style={styles.input}>{Array.from({ length: 11 }, (_, i) => <option key={i}>{i}명</option>)}</select></Field>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>옵션 및 추가비용</h2>
          {[1, 2, 3, 4].slice(0, optionCount).map((num) => (
            <Field key={num} label={`옵션 ${num}`}>
              <div style={styles.grid2Small}>
                <select value={optionItems[num - 1].name} onChange={(e) => updateOptionItem(num - 1, 'name', e.target.value)} style={styles.input}>{optionNames.map((name) => <option key={name}>{name}</option>)}</select>
                <select value={optionItems[num - 1].price} onChange={(e) => updateOptionItem(num - 1, 'price', e.target.value)} style={styles.input}>
                  <option>없음</option>
                  {Array.from({ length: 100 }, (_, i) => <option key={i + 1}>{i + 1}만원</option>)}
                </select>
              </div>
            </Field>
          ))}
          <button type="button" onClick={() => setOptionCount((prev) => Math.min(prev + 1, 4))} style={{ ...styles.button, border: '2px dashed #d1d5db', color: '#4b5563', background: '#ffffff' }}>+ 옵션 추가</button>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>견적 금액</h2>
          <div style={styles.grid2}>
            {moneyFields.map(([label, value, setter, readOnly]) => (
              <Field key={label} label={label}>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={value} readOnly={readOnly} onChange={setter ? (e) => setter(e.target.value) : undefined} style={{ ...styles.input, paddingRight: 56, background: readOnly ? '#f3f4f6' : '#ffffff' }} placeholder="0" />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#374151', fontSize: 16, fontWeight: 700 }}>만원</span>
                </div>
              </Field>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>입금 계좌</h2>
          <div style={{ border: '2px solid #14b8a6', background: '#ffffff', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 48, textAlign: 'center', flexWrap: 'wrap' }}>
              <div><div style={{ color: '#f97316', fontSize: 18, fontWeight: 900, marginBottom: 8 }}>예금주</div><div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>정병국</div></div>
              <div><div style={{ color: '#f97316', fontSize: 18, fontWeight: 900, marginBottom: 8, textAlign: 'left' }}>우리은행</div><div style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: -0.3 }}>1002-130-158228</div></div>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>비고 및 요청사항</h2>
          <Field label="고객 요청 및 주의사항"><textarea value={customerMemo} onChange={(e) => setCustomerMemo(e.target.value)} style={styles.textarea} placeholder="고객 요청 및 주의사항" /></Field>
          <Field label="견적 제외 품목"><textarea value={excludedItems} onChange={(e) => setExcludedItems(e.target.value)} style={styles.textarea} placeholder="견적 제외 품목" /></Field>
          <Field label="기타 메모"><textarea value={etcMemo} onChange={(e) => setEtcMemo(e.target.value)} style={styles.textarea} placeholder="기타 메모" /></Field>
        </section>

        <section data-capture-ignore="true" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <button type="button" onClick={saveContract} style={{ ...styles.button, background: '#14b8a6', color: '#ffffff' }}>계약서 저장</button>
          {saveStatus && <div style={{ borderRadius: 12, background: '#ecfeff', border: '1px solid #67e8f9', padding: 12, fontSize: 14, fontWeight: 700, color: '#111827' }}>{saveStatus}</div>}
          <button type="button" onClick={handlePdfDownload} style={{ ...styles.button, background: '#111827', color: '#ffffff' }}>PDF 계약서 생성</button>
          {pdfStatus && <div style={{ borderRadius: 12, background: '#f3f4f6', border: '1px solid #d1d5db', padding: 12, fontSize: 14, fontWeight: 700, color: '#111827' }}>{pdfStatus}</div>}
          <button type="button" onClick={handleImageDownload} style={{ ...styles.button, background: '#16a34a', color: '#ffffff' }}>이미지 저장 (PNG)</button>
          <button type="button" onClick={downloadICS} style={{ ...styles.button, background: '#2563eb', color: '#ffffff' }}>일정 등록 (.ICS)</button>
          <button type="button" onClick={shareContract} style={{ ...styles.button, background: '#facc15', color: '#111827' }}>카카오톡 공유</button>
          {shareStatus && <div style={{ borderRadius: 12, background: '#fefce8', border: '1px solid #fde047', padding: 12, fontSize: 14, fontWeight: 700, color: '#111827' }}>{shareStatus}</div>}
        </section>

        <section data-capture-ignore="true" style={styles.section}>
          <button
            type="button"
            onClick={() => setIsSavedListOpen((prev) => !prev)}
            style={{
              ...styles.button,
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #9ca3af',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>저장된 계약서 조회</span>
            <span>{isSavedListOpen ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>

          {isSavedListOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
                placeholder="고객명, 연락처, 주소, 날짜로 검색"
              />

              <button type="button" onClick={loadContracts} style={{ ...styles.button, background: '#6b7280', color: '#ffffff' }}>
                저장 목록 새로고침
              </button>

              <div style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: 12, background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 900, color: '#111827' }}>관리자 모드</div>
                {!isAdminMode ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      style={styles.input}
                      placeholder="관리자 비밀번호"
                    />
                    <button type="button" onClick={enterAdminMode} style={{ ...styles.button, width: 'auto', padding: '12px 16px', background: '#111827', color: '#ffffff' }}>
                      확인
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={exitAdminMode} style={{ ...styles.button, background: '#ef4444', color: '#ffffff' }}>
                    관리자 모드 끄기
                  </button>
                )}
                {adminStatus && <div style={{ color: isAdminMode ? '#0f766e' : '#b45309', fontSize: 13, fontWeight: 800 }}>{adminStatus}</div>}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  maxHeight: 430,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {filteredContracts.length === 0 ? (
                  <div style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: 12, background: '#ffffff', color: '#6b7280', fontWeight: 700 }}>
                    저장된 계약서가 없습니다.
                  </div>
                ) : (
                  filteredContracts.map((item, index) => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedContractId((prev) => (prev === item.id ? null : item.id))}
                        style={{
                          textAlign: 'left',
                          border: '1px solid #d1d5db',
                          borderRadius: 12,
                          padding: 12,
                          background: index < 5 ? '#ffffff' : '#f9fafb',
                          color: '#111827',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>{item.customerName || '고객명 없음'}</div>
                          <div style={{ fontWeight: 800, color: '#0f766e' }}>{selectedContractId === item.id ? '상세 접기 ▲' : '상세 보기 ▼'}</div>
                        </div>
                        <div style={{ fontWeight: 700 }}>{item.customerPhone || '연락처 없음'}</div>
                        <div>{item.moveDate || '운반일 없음'}</div>
                        <div style={{ color: '#6b7280', fontSize: 13 }}>{item.startAddress || '-'} → {item.endAddress || '-'}</div>
                      </button>

                      {selectedContractId === item.id && (
                        <div style={{ border: '1px solid #99f6e4', borderRadius: 12, padding: 12, background: '#f0fdfa' }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Arial, sans-serif', fontSize: 14, lineHeight: 1.6, color: '#111827' }}>
                            {buildSavedContractDetailText(item)}
                          </pre>

                          <button
                            type="button"
                            onClick={() => loadContractToForm(item)}
                            style={{ ...styles.button, marginTop: 12, background: '#0f766e', color: '#ffffff' }}
                          >
                            이 계약서 불러오기
                          </button>

                          {isAdminMode && (
                            <button
                              type="button"
                              onClick={() => softDeleteContract(item)}
                              style={{ ...styles.button, marginTop: 8, background: '#dc2626', color: '#ffffff' }}
                            >
                              관리자 삭제
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {filteredContracts.length > 5 && (
                <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                  총 {filteredContracts.length}개 중 5개 높이만 표시됩니다. 아래로 스크롤해서 더 볼 수 있습니다.
                </div>
              )}
            </div>
          )}
        </section>

        <div style={styles.helperText}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>계약금 입금계좌: {bankName} {accountNumber} (예금주: {accountHolder})</div>
          ※ 계약금 10% 납입 시 계약 확정
          <br />※ 카드 및 현금영수증 발행 시 부가세 10% 별도
          <br />※ 견적 외 추가 물품 발생 시 추가 비용 발생 가능
        </div>
      </div>
    </div>
  )
}

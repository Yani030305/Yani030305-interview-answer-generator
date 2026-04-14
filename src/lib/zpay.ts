import crypto from 'crypto'

interface ZPayConfig {
  pid: string
  key: string
  gateway: string
  notifyUrl: string
  cid?: string
}

export interface ZPayOrderParams {
  out_trade_no: string
  money: string
  name: string
  type: string
  notify_url: string
  return_url: string
  clientip: string
  cid?: string
  param?: string
}

export interface ZPayCallbackParams {
  [key: string]: string
  out_trade_no: string
  money: string
  trade_no: string
  trade_status: string
  sign: string
}

export interface ZPayApiResponse {
  code: number | string
  msg: string
  trade_no?: string
  o_id?: string
  payurl?: string
  qrcode?: string
  img?: string
}

class ZPay {
  private config: ZPayConfig

  constructor(config: ZPayConfig) {
    this.config = config
  }

  generateSign(params: Record<string, string>): string {
    const signStr = Object.keys(params)
      .filter((key) => {
        const value = params[key]
        return (
          key !== 'sign' &&
          key !== 'sign_type' &&
          value !== undefined &&
          value !== null &&
          value !== ''
        )
      })
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&')

    const finalStr = signStr + this.config.key
    console.log('ZPAY final sign string:', finalStr)

    return crypto.createHash('md5').update(finalStr, 'utf8').digest('hex')
  }

  verifySign(params: ZPayCallbackParams): boolean {
    const receivedSign = params.sign
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([key, value]) => {
        return (
          key !== 'sign' &&
          key !== 'sign_type' &&
          value !== undefined &&
          value !== null &&
          value !== ''
        )
      })
    ) as Record<string, string>

    const computedSign = this.generateSign(filteredParams)
    return receivedSign === computedSign
  }

  buildOrderParams(orderParams: ZPayOrderParams): Record<string, string> {
    const params: Record<string, string> = {
      pid: this.config.pid,
      type: orderParams.type,
      out_trade_no: orderParams.out_trade_no,
      notify_url: orderParams.notify_url,
      return_url: orderParams.return_url,
      name: orderParams.name,
      money: orderParams.money,
      clientip: orderParams.clientip,
      sign_type: 'MD5',
    }

    if (this.config.cid) {
      params.cid = this.config.cid
    }

    if (orderParams.cid) {
      params.cid = orderParams.cid
    }

    if (orderParams.param) {
      params.param = orderParams.param
    }

    params.sign = this.generateSign(params)

    console.log('ZPAY request params before submit:', params)

    return params
  }

  async createPayment(orderParams: ZPayOrderParams): Promise<ZPayApiResponse> {
    const params = this.buildOrderParams(orderParams)

    const response = await fetch(`${this.config.gateway}/mapi.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
      cache: 'no-store',
    })

    const text = await response.text()
    console.log('ZPAY raw response:', text)

    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`ZPAY返回非JSON内容: ${text}`)
    }
  }
}

export const createZPay = () => {
  const config: ZPayConfig = {
    pid: process.env.ZPAY_PID!,
    key: process.env.ZPAY_KEY!,
    gateway: process.env.ZPAY_GATEWAY || 'https://zpayz.cn',
    notifyUrl: process.env.ZPAY_NOTIFY_URL!,
    cid: process.env.ZPAY_CID,
  }

  console.log('ZPAY config loaded:', {
    pid: config.pid,
    gateway: config.gateway,
    notifyUrl: config.notifyUrl,
    cid: config.cid || '(empty)',
    hasKey: !!config.key,
  })

  if (!config.pid || !config.key || !config.gateway || !config.notifyUrl) {
    throw new Error('ZPAY configuration missing')
  }

  return new ZPay(config)
}
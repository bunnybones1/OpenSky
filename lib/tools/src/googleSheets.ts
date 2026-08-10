import * as fs from 'fs'
import * as http from 'http'
import * as url from 'url'
import { URLSearchParams } from 'url'
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const TOKEN_PATH = 'secrets/token.json'
const CRED_PATH = 'secrets/credentials.json'

export async function downloadSheets<T extends Record<string, string>>(
  spreadsheetId: string,
  sheetsToDownload: T,
  staggerMs = 2000
): Promise<T> {
  const auth = await authorize(JSON.parse(fs.readFileSync(CRED_PATH, 'utf8')))
  const sheets = google.sheets({ version: 'v4', auth })
  const result = await sheets.spreadsheets.get({
    spreadsheetId
  })

  const sheetUrl = result.data.spreadsheetUrl || ''
  const exportUrl = sheetUrl.replace(/\/edit/, '/export')
  const headers = {
    Authorization: 'Bearer ' + auth.credentials.access_token
  }

  const props = Object.keys(sheetsToDownload)

  const values: string[] = await Promise.all(
    props.map(async (prop, i) => {
      await new Promise(r => setTimeout(r, staggerMs * i + 1))
      const sheetName = sheetsToDownload[prop]
      const sheet = result.data.sheets?.find(
        sheet => sheet.properties?.title == sheetName
      )
      if (!sheet) {
        console.error("No sheet named '" + sheetName + "'")
        process.exit(1)
      }
      const params = {
        format: 'csv',
        gid: '' + (sheet.properties?.sheetId ?? '')
      }
      const urlParams = new URLSearchParams(Object.entries(params))

      const url = exportUrl + (exportUrl.includes('?') ? '&' : '?') + urlParams

      return fetch(url, {
        headers
      }).then(res => res.text())
    })
  )
  const sheet = props.reduce(
    (sheet, prop, i) => ({ ...sheet, [prop]: values[i] }),
    {}
  )

  return sheet as T
}

async function authorize(cred: any) {
  const { client_secret, client_id } = cred.installed
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:9472'
  )

  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')))
    return oAuth2Client
  }

  return getNewToken<typeof oAuth2Client>(oAuth2Client)
}

async function getNewToken<T = any>(oAuth2Client: any): Promise<T> {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  })

  console.log('Authorize this app by visiting this url:', authUrl)

  const code = await new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const queryObject = url.parse(req.url ?? '', true).query

      res.writeHead(200)
      res.end('Hello, World!')
      if ('code' in queryObject) {
        resolve(queryObject.code)
        server.close()
      }
    })
    server.listen(9472)
  })

  const token = await new Promise((resolve, reject) => {
    oAuth2Client.getToken(code, (err: any, token: any) => {
      err ? reject(err) : resolve(token)
    })
  })
  oAuth2Client.setCredentials(token)
  // Store the token to disk for later program executions
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token))
  console.log('Token stored to', TOKEN_PATH)

  return oAuth2Client
}

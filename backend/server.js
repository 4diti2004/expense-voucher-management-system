import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const usersPath = resolve(root, 'data/users.json')
const vouchersPath = resolve(root, 'data/vouchers.json')
const secret = process.env.JWT_SECRET || 'development-only-change-this-secret'
const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) }
  catch (error) { throw new Error(`Could not read data file ${path}: ${error.message}`) }
}
function writeJson(path, data) { writeFileSync(path, JSON.stringify(data, null, 2)) }
function userView(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department }
}
function authenticate(request, response, next) {
  const header = request.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return response.status(401).json({ message: 'Authentication is required.' })
  try { request.user = jwt.verify(token, secret); next() }
  catch { return response.status(401).json({ message: 'Your session has expired. Please sign in again.' }) }
}
function requireRole(...roles) {
  return (request, response, next) => roles.includes(request.user.role)
    ? next() : response.status(403).json({ message: 'You do not have permission for this action.' })
}
function validateVoucher(body) {
  const required = ['employee', 'department', 'expenseDate', 'category', 'description']
  if (required.some(field => typeof body[field] !== 'string' || !body[field].trim())) return 'All voucher fields are required.'
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero.'
  return null
}

app.get('/api/health', (request, response) => response.json({ ok: true }))

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body
  const user = readJson(usersPath).find(item => item.email.toLowerCase() === String(email || '').toLowerCase())
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    return response.status(401).json({ message: 'Invalid email or password.' })
  }
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role, department: user.department }, secret, { expiresIn: '8h' })
  response.json({ token, user: userView(user) })
})

app.get('/api/auth/me', authenticate, (request, response) => response.json({ user: request.user }))

app.get('/api/vouchers', authenticate, (request, response) => {
  const vouchers = readJson(vouchersPath)
  response.json(request.user.role === 'Employee'
    ? vouchers.filter(voucher => voucher.createdBy === request.user.id)
    : vouchers)
})

app.post('/api/vouchers', authenticate, (request, response) => {
  const error = validateVoucher(request.body)
  if (error) return response.status(400).json({ message: error })
  const vouchers = readJson(vouchersPath)
  const voucher = { ...request.body, id: randomUUID(), amount: Number(request.body.amount), status: 'Pending', createdBy: request.user.id, createdAt: new Date().toISOString() }
  vouchers.unshift(voucher)
  writeJson(vouchersPath, vouchers)
  response.status(201).json(voucher)
})

app.put('/api/vouchers/:id', authenticate, (request, response) => {
  const error = validateVoucher(request.body)
  if (error) return response.status(400).json({ message: error })
  const vouchers = readJson(vouchersPath)
  const index = vouchers.findIndex(voucher => voucher.id === request.params.id)
  if (index < 0) return response.status(404).json({ message: 'Voucher not found.' })
  if (request.user.role === 'Employee' && vouchers[index].createdBy !== request.user.id) return response.status(403).json({ message: 'You can only edit your own vouchers.' })
  vouchers[index] = { ...vouchers[index], ...request.body, amount: Number(request.body.amount) }
  writeJson(vouchersPath, vouchers)
  response.json(vouchers[index])
})

app.delete('/api/vouchers/:id', authenticate, (request, response) => {
  const vouchers = readJson(vouchersPath)
  const voucher = vouchers.find(item => item.id === request.params.id)
  if (!voucher) return response.status(404).json({ message: 'Voucher not found.' })
  if (request.user.role === 'Employee' && voucher.createdBy !== request.user.id) return response.status(403).json({ message: 'You can only delete your own vouchers.' })
  writeJson(vouchersPath, vouchers.filter(item => item.id !== request.params.id))
  response.status(204).end()
})

app.patch('/api/vouchers/:id/status', authenticate, requireRole('Manager', 'Admin'), (request, response) => {
  if (!['Pending', 'Approved', 'Rejected'].includes(request.body.status)) return response.status(400).json({ message: 'Invalid voucher status.' })
  const vouchers = readJson(vouchersPath)
  const voucher = vouchers.find(item => item.id === request.params.id)
  if (!voucher) return response.status(404).json({ message: 'Voucher not found.' })
  voucher.status = request.body.status
  voucher.reviewedBy = request.user.id
  voucher.reviewedAt = new Date().toISOString()
  writeJson(vouchersPath, vouchers)
  response.json(voucher)
})

const port = Number(process.env.PORT || 4000)
app.listen(port, () => console.log(`Vouchery API running at http://localhost:${port}`))

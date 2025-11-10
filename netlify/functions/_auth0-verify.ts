import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'

let cachedIssuer: string | null = null
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null

const buildIssuerFromEnv = () => {
  const rawIssuer = process.env.AUTH0_ISSUER?.trim()
  if (rawIssuer) {
    const normalized = rawIssuer.endsWith('/') ? rawIssuer : `${rawIssuer}/`
    return normalized
  }

  const rawDomain =
    process.env.AUTH0_DOMAIN?.trim() || process.env.VITE_AUTH0_DOMAIN?.trim()
  if (!rawDomain) {
    throw new Error('Missing AUTH0_ISSUER or AUTH0_DOMAIN environment variable')
  }

  const domainWithProtocol = rawDomain.startsWith('http://') || rawDomain.startsWith('https://')
    ? rawDomain
    : `https://${rawDomain}`

  return domainWithProtocol.endsWith('/')
    ? domainWithProtocol
    : `${domainWithProtocol}/`
}

const getIssuer = () => {
  if (!cachedIssuer) {
    cachedIssuer = buildIssuerFromEnv()
  }
  return cachedIssuer
}

const getJwks = () => {
  if (!cachedJwks) {
    const issuer = getIssuer()
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`))
  }
  return cachedJwks
}

export async function verifyJwt(token: string): Promise<JWTPayload> {
  const issuer = getIssuer()
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer,
  })
  return payload
}

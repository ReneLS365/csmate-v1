import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'

const rawIssuer = process.env.AUTH0_ISSUER_BASE_URL?.trim()
if (!rawIssuer) {
  throw new Error('Missing AUTH0_ISSUER_BASE_URL environment variable')
}

const issuer = rawIssuer.endsWith('/') ? rawIssuer : `${rawIssuer}/`
const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`))

let cachedAudience: string[] | null = null

const buildAudienceFromEnv = (): string[] => {
  const rawCandidates = [
    process.env.AUTH0_AUDIENCE,
    process.env.AUTH0_API_AUDIENCE,
    process.env.AUTH0_CLIENT_ID,
  ]

  const audiences = rawCandidates
    .flatMap(candidate => candidate?.split(',') ?? [])
    .map(candidate => candidate.trim())
    .filter(candidate => candidate.length > 0)

  if (audiences.length === 0) {
    throw new Error(
      'Missing AUTH0_AUDIENCE/AUTH0_API_AUDIENCE/AUTH0_CLIENT_ID configuration for JWT verification',
    )
  }

  return Array.from(new Set(audiences))
}

const getAudience = () => {
  if (!cachedAudience) {
    cachedAudience = buildAudienceFromEnv()
  }
  return cachedAudience
}

export async function verifyJwt(token: string): Promise<JWTPayload> {
  const audience = getAudience()
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: audience.length === 1 ? audience[0] : audience,
  })
  return payload
}

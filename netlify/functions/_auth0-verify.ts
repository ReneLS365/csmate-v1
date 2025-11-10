import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'

const rawIssuer = process.env.AUTH0_ISSUER_BASE_URL
if (!rawIssuer) {
  throw new Error('AUTH0_ISSUER_BASE_URL env var mangler')
}

const issuer = rawIssuer.endsWith('/') ? rawIssuer : `${rawIssuer}/`
const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`))

export async function verifyJwt(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    // aud kan evt. tilføjes senere når audience er låst ned
  })
  return payload
}

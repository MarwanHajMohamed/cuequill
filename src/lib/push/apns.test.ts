import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify as cryptoVerify } from "node:crypto";
import { getProviderToken } from "./apns.ts";

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

test("getProviderToken produces a verifiable ES256 JWT", () => {
  // A real APNs auth key is an EC P-256 (prime256v1) private key in PKCS#8 PEM.
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  const token = getProviderToken("ABC1234567", "TEAM765432", pem);
  const [header, claims, signature] = token.split(".");
  assert.ok(header && claims && signature, "token has three parts");

  // Header: alg + kid.
  const h = JSON.parse(b64urlToBuf(header).toString("utf8"));
  assert.equal(h.alg, "ES256");
  assert.equal(h.kid, "ABC1234567");

  // Claims: issuer + issued-at.
  const c = JSON.parse(b64urlToBuf(claims).toString("utf8"));
  assert.equal(c.iss, "TEAM765432");
  assert.equal(typeof c.iat, "number");

  // The signature must verify against the public key using the raw r||s
  // (ieee-p1363) encoding APNs/JOSE require - a DER signature would fail here.
  const ok = cryptoVerify(
    "sha256",
    Buffer.from(`${header}.${claims}`),
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    b64urlToBuf(signature),
  );
  assert.equal(ok, true, "ES256 signature verifies with ieee-p1363 encoding");
});

test("getProviderToken accepts a key with escaped newlines", () => {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  // Simulate a single-line env var where newlines are escaped.
  const escaped = pem.replace(/\n/g, "\\n");

  const token = getProviderToken("KEY0000001", "TEAM000001", escaped);
  assert.equal(token.split(".").length, 3);
});

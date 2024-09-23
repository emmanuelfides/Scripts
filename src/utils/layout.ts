const lo = require('buffer-layout');

/**
 * Layout for a public key
 */
export const publicKey = (
  property: string = "publicKey"
) => {
  return lo.blob(32, property);
};

/**
 * Layout for a 64bit unsigned value
 */
export const uint64 = (property: string = "uint64") => {
  return lo.blob(8, property);
};

export const getInitIxLayout = () => {
  return lo.struct([
    lo.u8("tag"),
    lo.u8("bump"),
    uint64("pricePerTokenY"),
    publicKey("whitelistCreator"),
    publicKey("w1"),
    publicKey("w2"),
    publicKey("w3"),
    publicKey("w4"),
    publicKey("w5"),
  ]);
};

export const getWhitelistStateLayout = () => {
  return lo.struct([
    publicKey("whitelistCreator"),
    lo.u8("globalPDABump"),
    lo.struct(
      [
        publicKey("whitelistCreator"),
        publicKey("w1"),
        publicKey("w2"),
        publicKey("w3"),
        publicKey("w4"),
        publicKey("w5"),
      ],
      "authorizedAddresses"
    ),
    lo.u8("isInitialized"),
    publicKey("tokenSwapPoolState"),
    publicKey("yMintAccount"),
    publicKey("yTokenAccount"),
    publicKey("nativeSolTokenAccount"),
    uint64("pricePerTokenY"),
  ]);
};

export const getWhiteListUserStateLayout = () => {
  return lo.struct([
    lo.u8("isInitialized"),
    publicKey("whiteListedByAccount"),
    uint64("whitelistedAt"),
    publicKey("userTransferAuthorityAccount"),
  ]);
};

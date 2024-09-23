import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { getWhiteListUserStateLayout } from "../../utils/layout";
import {
  PRICE_PER_TOKEN_B,
  SOLANA_CONNECTION,
  TOKEN_PROGRAM_ID,
  TOKEN_SWAP_FEE_OWNER,
  WHITELIST_PROGRAM_ID,
  TOTAL_ACCOUNTS_ALLOWED,
  TOKEN_SWAP_PROGRAM_ID,
} from "../../constants";
import { TokenSwap, TokenSwapLayout } from "@solana/spl-token-swap";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token-v3";
import {
  checkKeysDir,
  getKeyPair,
  getMintToken,
  getPublicKey,
  getTokenAccount,
  sleep,
  storeKeypair,
} from "../../utils/file";

(async function () {
  try {
    const {
      user,
      userWall,
      wlstMintAccount,
      wsolMintAccount,
      tokenSwapStateAccount,
      userNativeSolTokenAccount,
      swapAuthorityPDA,
      whitelistUserStateAccount,
      whitelistGlobalStateAccount,
      poolMintToken,
    } = await checkForPreRequisites();

    console.log(
      "WHITELIST USER STATE ACCOUNT",
      whitelistUserStateAccount.publicKey.toString()
    );

    // Fetching or Creating Token
    console.log("FETCHING/CREATING TOKEN Y ACCOUNT FOR USER");
    const userWlstTokenAccount =
      await wlstMintAccount.getOrCreateAssociatedAccountInfo(
        userWall.publicKey
      );
    const tokenSwapAccountInfo = await SOLANA_CONNECTION.getAccountInfo(
      tokenSwapStateAccount
    );
    const pool = await TokenSwapLayout.decode(tokenSwapAccountInfo?.data);
    const poolAcc = await new PublicKey(pool.tokenPool);
    const tokenA = await new PublicKey(pool.tokenAccountA);
    const tokenB = await new PublicKey(pool.tokenAccountB);
    const feeAcc = await new PublicKey(pool.feeAccount);
    const wlstMint = await new PublicKey(pool.mintB);

    // Approving lp Token
    console.log("APPROVING LP FOR A TEMP AUTH KEYPAIR");
    const tempAuthTokenAccount = new Keypair();
    await wsolMintAccount.approve(
      new PublicKey('HQ2w2UBU6ftqjHkExF4tUG2DGoHBjgrT4xXXXAAbt9iV'),
      tempAuthTokenAccount.publicKey,
      user,
      [],
      1000 * LAMPORTS_PER_SOL
    );
    console.log(user.publicKey)

    const instruction = await TokenSwap.withdrawAllTokenTypesInstruction(
      tokenSwapStateAccount,
      swapAuthorityPDA,
      tempAuthTokenAccount.publicKey,
      poolMintToken.publicKey,
      feeAcc,
      new PublicKey('HQ2w2UBU6ftqjHkExF4tUG2DGoHBjgrT4xXXXAAbt9iV'),
      tokenA,
      tokenB,
      userNativeSolTokenAccount,
      userWlstTokenAccount.address,
      TOKEN_SWAP_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      TOTAL_ACCOUNTS_ALLOWED * 10 ** 2,
      0,
      0
    );

    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } =
      await SOLANA_CONNECTION.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = user.publicKey;

    transaction.add(instruction);
    transaction.sign(user, tempAuthTokenAccount);

    const signature = await SOLANA_CONNECTION.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false }
    );
    console.info(signature);

    await SOLANA_CONNECTION.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "processed"
    );
  } catch (err) {
    console.error(err);
  }
})();

async function checkForPreRequisites() {
  if (!(await checkKeysDir())) {
    throw new Error(
      "Keys directory does not exist. Please run yarn storeaddress to generate all addresses"
    );
  }

  const user = await getKeyPair("whitelistCreator", "persons");
  const userWall = await getKeyPair("user", "persons");
  let whitelistUserStateAccount = await getKeyPair("whiteListUser", "state");

  if (!user || !userWall || !whitelistUserStateAccount) {
    throw new Error("Required person/state accounts doesn't exist");
  }

  if (
    await SOLANA_CONNECTION.getAccountInfo(whitelistUserStateAccount.publicKey)
  ) {
    whitelistUserStateAccount = await storeKeypair(
      "whiteListUser",
      "state",
      true
    );
  }

  if (!whitelistUserStateAccount) {
    throw new Error("Whitelist User state account not found");
  }

  if (!(await SOLANA_CONNECTION.getBalance(user.publicKey))) {
    throw new Error(
      "User does not have enough funds. Please run yarn fundaddress to fund all addresses"
    );
  }

  const wlstMintAccount = await getMintToken("wlst", user);
  const wsolMintAccount = await getMintToken("wsol", user);

  if (!wlstMintAccount || !wsolMintAccount) {
    throw new Error("SPL Token Mint missing. Please run yarn createmint");
  }

  const tokenSwapStateAccount = await getPublicKey("tokenSwap", "state");

  if (!tokenSwapStateAccount) {
    throw new Error(
      "Token Swap State Account missing. Please run yarn createpool"
    );
  }

  let swapAuthorityPDA = await getPublicKey("swapAuthority");

  if (!swapAuthorityPDA) {
    [swapAuthorityPDA] = await PublicKey.findProgramAddress(
      [tokenSwapStateAccount.toBytes()],
      TOKEN_SWAP_PROGRAM_ID
    );
  }

  const poolMintToken = await getMintToken(
    "pool",
    new Keypair({
      publicKey: swapAuthorityPDA.toBytes(),
      secretKey: Buffer.from(""),
    })
  );

  if (!poolMintToken) {
    throw new Error(
      "Pool Mint Token doesn't exist. Please run yarn createpool"
    );
  }

  const whitelistGlobalStateAccount = await getPublicKey("whiteList", "state");

  if (!whitelistGlobalStateAccount) {
    throw new Error(
      "Whitelist Global State Account missing. Please run yarn initpda"
    );
  }

  const userNativeSolTokenAccount = await getTokenAccount(
    "whitelistCreator",
    "wsol"
  );

  if (!userNativeSolTokenAccount) {
    throw new Error(
      "User doesn't have a native SOL associated Token account. Please run yarn wrapsol"
    );
  }

  return {
    user,
    userWall,
    userNativeSolTokenAccount,
    wlstMintAccount,
    wsolMintAccount,
    swapAuthorityPDA,
    poolMintToken,
    tokenSwapStateAccount,
    whitelistGlobalStateAccount,
    whitelistUserStateAccount,
  };
}

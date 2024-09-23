import {
    TokenSwap,
    TokenSwapLayout,
    TOKEN_SWAP_PROGRAM_ID,
  } from "@solana/spl-token-swap";
  import { Token } from "@solana/spl-token";
  import {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction
  } from "@solana/web3.js";
  import BN from "bn.js";
  import { SOLANA_CONNECTION } from "../constants";
  import { getKeyPair } from "../utils/file";

 export async function withdrawLiquidity(
    tokenSwapAccount: PublicKey,
    tokenSwapAuthority: PublicKey,
    userTokenAccountA: PublicKey,
    userTokenAccountB: PublicKey,
    poolTokenAccount: PublicKey,
    poolTokenAccountAuthority: PublicKey,
    userTokenAccountAWithdrawAmount: number,
    userTokenAccountBWithdrawAmount: number
  ): Promise<string> {
    const transaction = new Transaction();
    const wallet = getKeyPair("whitelistCreator", "persons");
    console.log(wallet)
    console.log("ff")
    return;
    // Withdraw tokens from the pool
    const poolTokenAmount = userTokenAccountAWithdrawAmount + userTokenAccountBWithdrawAmount;
    const poolTokenMint = await Token.getAssociatedTokenAddress(
      new PublicKey(tokenSwapAccount),
      poolTokenAccount,
      new PublicKey(poolTokenAccount),
      wallet.publicKey
    );
    // Swap tokens
    transaction.add(
      TokenSwap.createInitSwapInstruction(
        tokenSwapAccount,
        tokenSwapAuthority,
        userTokenAccountA,
        userTokenAccountB,
        poolTokenAccount,
        poolTokenAccountAuthority,
        userTokenAccountAWithdrawAmount,
        userTokenAccountBWithdrawAmount
      )
    );
  
    // Send the transaction
    const signature = await sendAndConfirmTransaction(
      SOLANA_CONNECTION,
      transaction,
      [getKeyPair("whitelistCreator", "persons")]
    );
    console.log(signature)
    return signature;
  }
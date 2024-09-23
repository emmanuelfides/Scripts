import {
  SOLANA_CONNECTION,
  TOKEN_NAMES,
  TOTAL_ACCOUNTS_ALLOWED,
} from "../../constants";
import { PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token-v3";
import {
  checkKeysDir,
  getKeyPair,
  getMintToken,
  storeTokenAccount,
  sleep
} from "../../utils/file";
import { createTokenAccountWithSOL } from "../../utils/token";
const { findMetadataPda } =  require("@metaplex-foundation/js");
const {
  createCreateMetadataAccountV3Instruction,
} = require("@metaplex-foundation/mpl-token-metadata");

(async function () {
  try {
    if (!(await checkKeysDir())) {
      throw new Error(
        "Keys Directory Not found. Please run yarn storeaddress to generate addresses"
      );
    }

    const whitelistCreator = await getKeyPair("whitelistCreator", "persons");

    if (!whitelistCreator) {
      throw new Error("Pool Creator Keypair not found");
    }

    if (
      (await SOLANA_CONNECTION.getBalance(whitelistCreator.publicKey)) === 0
    ) {
      throw new Error(
        "Insufficient funds for Pool Creator. Please run yarn fundaddress to fund all accounts"
      );
    }

    const wlstMintAccount = await getMintToken("wlst", whitelistCreator);

    if (!wlstMintAccount) {
      throw new Error(
        "Invalid Token B Mint account, please run yarn createmint to genereate mint accounts"
      );
    }

    console.log("CREATING TOKEN A ACCOUNT FOR THE WHITELIST CREATOR");
const nativeSolAcc = await createTokenAccountWithSOL(whitelistCreator, 1);
    await storeTokenAccount(
      "whitelistCreator",
      TOKEN_NAMES["wsol"],
      nativeSolAcc,
      true
    );
    console.log(
      "TOKEN A ACCOUNT CREATED SUCCESSFULLY",
      nativeSolAcc.toString()
    );

    console.log("CREATING TOKEN B ACCOUNT FOR THE WHITELIST CREATOR");

    const wlstTokenAccount = await getOrCreateAssociatedTokenAccount(
      SOLANA_CONNECTION,
      whitelistCreator,
      wlstMintAccount.publicKey,
      whitelistCreator.publicKey
    )
    
    await storeTokenAccount(
      "whitelistCreator",
      TOKEN_NAMES["wlst"],
      wlstTokenAccount.address,
      true
    );
    console.log(
      "TOKEN B ACCOUNT CREATED SUCCESSFULLY",
      wlstTokenAccount.address.toString()
    );

    console.log(`MINTING ${TOTAL_ACCOUNTS_ALLOWED} TOKEN B FOR THE ACCOUNT`);
    await wlstMintAccount.mintTo(
      wlstTokenAccount.address,
      whitelistCreator,
      [],
      TOTAL_ACCOUNTS_ALLOWED * 10 ** 2
    );

    console.log(`ADDING METADATA FOR TOKEN B`);
    const mint = wlstMintAccount.publicKey;
    const metadataPDA = await findMetadataPda(mint);
    const tokenMetadata = {
      name: "Testnet", 
      symbol: "TSTN",
      image: "https://bafybeigiunalea6awqduj266biteld3sq2x5odzglcie3uixtyxopkkbla.ipfs.w3s.link/6qW2XkuI_400x400.png",
      uri: "https://bafybeie46nqkc3s4g24ur2chghsdzp2dx7iuvt6f56fmuysr5rs4pwhd7y.ipfs.w3s.link/testt.json",
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null
    };
    const updateMetadataTransaction = new Transaction().add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint,
          mintAuthority: whitelistCreator.publicKey,
          payer: whitelistCreator.publicKey,
          updateAuthority: whitelistCreator.publicKey
        },
        {
          createMetadataAccountArgsV3: {
            data: tokenMetadata,
            collectionDetails: null,
            isMutable: true,
          },
        }
      )
    );
    await sendTransaction(updateMetadataTransaction, [])
    
    async function sendTransaction(transaction :any, signers:any) {
      transaction.feePayer = whitelistCreator?.publicKey
      transaction.recentBlockhash = (await SOLANA_CONNECTION.getRecentBlockhash('max')).blockhash;
      await transaction.setSigners(whitelistCreator?.publicKey,...signers.map((s:any) => s.publicKey));
      if(signers.length != 0) await transaction.partialSign(...signers)
      // const signedTransaction = await wallet.signTransaction(transaction)
      var signature = await sendAndConfirmTransaction(
        SOLANA_CONNECTION,
        transaction,
        [whitelistCreator as any]
      );
      console.log("SIGNATURE", signature);
      return signature;
    }
    console.log(`METADATA ADDED SUCCESSULLY`)

    console.log(`STOPPING FURTHER MINTING FOR TOKEN B`);
    await wlstMintAccount.setAuthority(
      wlstMintAccount.publicKey,
      null,
      "MintTokens",
      whitelistCreator,
      []
    );
  } catch (err) {
    console.error(err.message);
  }
})();

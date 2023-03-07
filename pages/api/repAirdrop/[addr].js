import { MerkleTree } from "merkletreejs";
import { keccak256 } from "web3-utils"
import fs from "fs";
import { tmpdir } from "os";
import Cors from 'cors';
import path from 'path';
// Initializing the cors middleware
const cors = Cors({
  origin: '*' //allow any
})

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

const DEBUG = false;
const airdropCID = "bafybeifo3suusbptvmxbexx4iv4k33s6sfxoet5myjwrsexike7cz7i3fe";
const airdropUrl = `https://dweb.link/ipfs/${airdropCID}/airdrop.json`;
let merkleTree, treeDB, merkleRootHash;

const buildTree = async () => {
  if (merkleTree) return;
  let jsonFile
  const filepath = path.join(process.cwd(), 'assets', 'airdrop.json');
  if(process.env.NEXT_PUBLIC_ENABLE_IPFS !== 'true' && fs.existsSync(filepath))
  {
    console.log("getting tree from local storage");
    let jsonFile = JSON.parse(
        fs.readFileSync(filepath)
    );

  }
  else if (fs.existsSync(tmpdir() + "/" + airdropCID)) {
    console.log("getting tree from disk cache", {tmpdir:tmpdir()});
    jsonFile = JSON.parse(
      fs.readFileSync(tmpdir() + "/" + airdropCID).toString()
    );
  }
  else {
    console.log('fetching file from:',airdropUrl);
    jsonFile = await fetch(airdropUrl).then(async (_) => {
      const result = await _.json();
      fs.writeFileSync(tmpdir() + "/" + airdropCID, JSON.stringify(result));
      return result;
    });
  }

  console.log("got json file, building tree...");
  const { treeData, merkleRoot } = jsonFile;
  merkleRootHash = merkleRoot

  treeDB = treeData;
  let entries = Object.entries(treeData);
  let idx = 0;
  let elements = entries.map((e) => {
    e[1].index = idx++;
    return Buffer.from(e[1].hash.slice(2), "hex");
  });

  console.log(
    "creating merkletree...",
    elements.length,
    elements[0],
    entries[0]
  );
  merkleTree = new MerkleTree(elements, keccak256);

  const calcMerkleRoot = merkleTree.getHexRoot()
  console.log("merkleroots:", {
    fromFile: merkleRoot,
    calculated: calcMerkleRoot
  });

  return true;
};
let ready = false;
buildTree().then((_) => (ready = true));

export default async function handler(req, res) {
  // Run the middleware
  await runMiddleware(req, res, cors)
  
  if (!ready) {
    return res.status(400).json({ error: `warming tree cache` });
  }
  
  let { addr } = req.query;
  if (DEBUG) {
    const totalAddrs = Object.keys(treeDB).length;
    console.log({ totalAddrs, first: Object.entries(treeDB)[0] });
  }

  const addrData = treeDB[addr] || treeDB[addr.toLowerCase()];
  if (!addrData) {
    return res
      .status(400)
      .json({ error: `address ${addr} does not exists in tree` });
  }

  const proofFor = addrData.hash

  const proof = merkleTree.getPositionalHexProof(proofFor)
  const proofIndex = addrData.index + 1; //proof indexes start from 1

  if (DEBUG) {
    console.log(
      "checkProof:",
      merkleTree.verify(proof, proofFor,merkleRootHash),
      {proof}
    );
  }
  const isRightNode = proof.map(_ => !!_[0]);
  const hexProof = proof.map(_ => _[1]);
  res.json({ addr, hexProof,isRightNode, proofIndex, reputationInWei: addrData.rep, merkleRootHash });
}

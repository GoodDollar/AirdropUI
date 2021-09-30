import MerkleTree, {
  checkProof,
  checkProofOrdered
} from "merkle-tree-solidity";
import fs from "fs";
import { tmpdir } from "os";

const DEBUG = true;
const airdropCID = "QmVqQrssaShua8oERVmudrroPaLb1UvghymTY9x2SoF7Vi";
const airdropUrl = `https://ipfs.io/ipfs/${airdropCID}/airdrop.json`;
let merkleTree, treeDB;

const buildTree = async () => {
  if (merkleTree) return;
  let jsonFile;
  if (fs.existsSync(tmpdir + "/" + airdropCID)) {
    console.log("getting tree from disk cache");
    jsonFile = JSON.parse(
      fs.readFileSync(tmpdir + "/" + airdropCID).toString()
    );
  }
  jsonFile = await fetch(airdropUrl).then((_) => {
    const result = _.json();
    fs.writeFileSync(tmpdir + "/" + airdropCID, JSON.stringify(result));
    return result;
  });

  const { treeData, merkleRoot } = jsonFile;

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
  merkleTree = new MerkleTree(elements, true);

  const calcMerkleRoot = merkleTree.getRoot().toString("hex");
  console.log("merkleroots1:", {
    fromFile: merkleRoot,
    calculated: calcMerkleRoot
  });

  return true;
};
let ready = false;
buildTree().then((_) => (ready = true));
export default async function handler(req, res) {
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

  const proofFor = Buffer.from(addrData.hash.slice(2), "hex");

  const proof = merkleTree.getProof(proofFor);
  const proofIndex = addrData.index + 1; //proof indexes start from 1

  if (DEBUG) {
    console.log(
      "checkProof:",
      checkProofOrdered(proof, merkleTree.getRoot(), proofFor, proofIndex)
    );
  }
  const hexProof = proof.map((_) => "0x" + _.toString("hex"));

  res.json({ addr, hexProof, proofIndex, reputationInWei: addrData.rep });
}

// test/medical-report.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MedicalReportManager", function () {
  it("creates report and retrieves encrypted key", async function () {
    const [owner, doc1, doc2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MedicalReportManager", owner);
    const contract = await Factory.deploy();
    await contract.deployed();

    const cid = "bafybeiexamplecid";
    const description = "X-Ray report";

    const recipients = [owner.address, doc1.address];
    // In reality these strings are base64 ciphertexts; here we use sample placeholders
    const encryptedKeys = ["ownerEncryptedKeyBase64", "doc1EncryptedKeyBase64"];

    const tx = await contract.connect(owner).createReport(cid, description, recipients, encryptedKeys);
    const rc = await tx.wait();

    const reportId = await contract.reportCount();
    const report = await contract.getReport(reportId);
    expect(report.owner).to.equal(owner.address);
    expect(report.cid).to.equal(cid);

    const ownerEncrypted = await contract.connect(owner).getMyEncryptedKey(reportId);
    expect(ownerEncrypted).to.equal("ownerEncryptedKeyBase64");

    const doc1Encrypted = await contract.connect(doc1).getMyEncryptedKey(reportId);
    expect(doc1Encrypted).to.equal("doc1EncryptedKeyBase64");
  });
});


// scripts/checkBAL.ts
import hre from "hardhat";

async function main() {
    const { ethers } = hre;

    // pick token address and account from env if available, otherwise fallback to known defaults
    const tokenAddress =
        process.env.VITE_BAL_TOKEN_CONTRACT_ADDRESS_SEPOLIA ||
        process.env.BAL_TOKEN_ADDRESS ||
        "0x7307418690bf2De4DdE9590032857152F96d447D"; // <- replace if different

    const account =
        process.env.FROM ||
        process.env.VOTER ||
        process.env.DEFAULT_ADDRESS ||
        "0x669b237a521621a7Bc242a18B94f695f52340B9A"; // <- replace with the address you want to check

    // minimal ERC20 ABI
    const abi = [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
    ];

    // use provider from hardhat network config
    const provider = ethers.provider;

    const token = new ethers.Contract(tokenAddress, abi, provider);

    const raw = await token.balanceOf(account);
    let decimals = 18;
    try {
        decimals = Number(await token.decimals());
    } catch (e) {
        // ignore, keep 18
    }
    let symbol = "BAL";
    try {
        symbol = String(await token.symbol());
    } catch (e) { }

    // format using ethers v6 / v5 compatibility
    const formatted =
        ethers.formatUnits?.(raw, decimals) ?? ethers.utils?.formatUnits(raw, decimals);

    console.log(`BAL balance for ${account}: ${formatted} ${symbol} (token: ${tokenAddress})`);
}

main().catch((err) => {
    // helpful debug info
    // eslint-disable-next-line no-console
    console.error("checkBAL error:", err);
    process.exit(1);
});

import { 
  ConnectWallet, 
  toEther, 
  toWei, 
  useAddress, 
  useBalance, 
  useContract, 
  useContractRead, 
  useContractWrite, 
  useSDK, 
  useTokenBalance 
} from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import SwapInput from "../components/SwapInput";

const Home: NextPage = () => {
  const TOKEN_CONTRACT = "0xdEeD89f4C461c6E12bE39bFfc9E367f0E169944A";
  const DEX_CONTRACT = "0x7ce6E73dd11685865595E8FF648427518aEE7A7F";

  const sdk = useSDK();
  const address = useAddress();

  const {contract: tokenContract} = useContract(TOKEN_CONTRACT);
  const {contract: dexContract} = useContract(DEX_CONTRACT);

  const {data: symbol} = useContractRead(tokenContract, "symbol");
  const {data: tokenBalance} = useContractRead(tokenContract, address);

  const {data: nativeBalance} = useBalance();
  const {data: contractTokenBalance} = useTokenBalance(tokenContract, DEX_CONTRACT);

  const [contractBalance, setContractBalance] = useState<String>("0");
  const [nativeValue, setNativeValue] = useState<String>("0");
  const [tokenValue, setTokenValue] = useState<String>("0");
  const [currentForm, setCurrentForm] = useState<String>("native");
  const [isLoading, setIsLoading] = useState<Boolean>(false);

  const {mutateAsync: swapNativeToken} = useContractWrite(dexContract, "swapEthToToken");
  const {mutateAsync: swapTokenToNative} = useContractWrite(dexContract, "swapTokenToEth");
  const {mutateAsync: approveTokenSpending} = useContractWrite(tokenContract, "approve");

  const {data: amountToGet} = useContractRead(
    dexContract,
    "getAmountOfTokens",
    currentForm==="native"
    ? [
      toWei(nativeValue as string || "0"),
      toWei(contractBalance as string || "0"),
      contractTokenBalance?.value,
      ]
    : [
      toWei(tokenValue as string || "0"),
      contractTokenBalance?.value,
      toWei(contractBalance as string || "0"),
      ]
  );

  const fetchContractBalance = async () => {
    try {
      const balance = await sdk?.getBalance(DEX_CONTRACT);
      setContractBalance(balance?.displayValue || "0");
    } catch (error) {
      console.error(error);
    }
  }

  const executeSwap = async () => {
    setIsLoading(true);
    try {
      if(currentForm==="native") {
        await swapNativeToken({
          overrides: {
            value: toWei(nativeValue as string || "0")
          }
        });
        alert("Swap executed successfully");
      } else {
        await approveTokenSpending({
          args: [DEX_CONTRACT, toWei(tokenValue as string || "0")]
        });
        await swapTokenToNative({
          args: [toWei(tokenValue as string || "0")]
        });
        alert("Swap executed successfully");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while trying to execute the swap");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchContractBalance();
    setInterval(fetchContractBalance, 10000);
  },[]);

  useEffect(() => {
    if(!amountToGet) return;
    if(currentForm==="native") {
      setTokenValue(toEther(amountToGet));
    } else {
      setNativeValue(toEther(amountToGet));
    }
  },[amountToGet]);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div style={{
          backgroundColor: "#111",
          padding: "2rem",
          borderRadius: "10px",
          minWidth: "500px",
        }}>
          <div style={{
            display: "flex",
            flexDirection: currentForm==="native" ? "column" : "column-reverse",
            alignItems: "center",
            justifyContent: "center",
            margin: "10px",
          }}>
            <SwapInput
              current={currentForm as string}
              type="native"
              max={nativeBalance?.displayValue}
              value={nativeValue as string} 
              setValue={setNativeValue}
              tokenSymbol="MATIC"
              tokenBalance={nativeBalance?.displayValue}
            />
            <button
              onClick={()=>{
                currentForm === "native"
                ? setCurrentForm("token")
                : setCurrentForm("native")
              }}
              className={styles.toggleButton}
            >↓</button>
            <SwapInput
              current={currentForm as string}
              type="token"
              max={nativeBalance?.displayValue}
              value={tokenValue as string} 
              setValue={setTokenValue}
              tokenSymbol={symbol as string}
              tokenBalance={nativeBalance?.displayValue}
            />
          </div>
          {address ? (
            <div style={{textAlign: "center"}}>
              <button
                onClick={executeSwap}
                disabled={isLoading as boolean}
              >{
                isLoading
                ? "Loading..."
                : "Swap"
              }</button>
            </div>
          ) : (
            <p>Connect a wallet to exchange.</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default Home;

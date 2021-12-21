import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, {useState, useEffect, useRef, useCallback} from 'react';
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";

import SwitchAndConnectButton from '../../lib/switchConnectButton.js';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorHandler from './ErrorHandler.js';
import {getClaimStatus, formatAddress} from '../../lib/connect.serv.js';


const stateChainIds = {
  productionMain: 1,
  production: 122
}

/**
 * Switch networks with local requests. Checks proveAtBlockchain for claimStatus on mount.
 * @notice adds fuse network if not yet added to metamask
 * @param props contains: currentConnection Object, isMobile boolean, 
 * getReputation callBack (claimDialog), proofData array  
 * @returns 
 */

export default function Switch(props) {
  const [providerInstance, setProviderInstance] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [connectedChain, setConnectedChain] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [query, setQuery] = useState({status: null});
  const [error, setError] = useState({status: null, code: null});
  const [isClaimed, setIsClaimed] = useState({productionMain: false, production: false});
  const [isMob, setIsMobile] = useState(null);
  const [displayAddress, setDisplayAddress] = useState(null);

  const connectedAddressRef = useRef(connectedAddress);
  const connectedChainRef = useRef(connectedChain);
  const chainIdRef = useRef(chainId);

  useEffect(() => {
    chainIdRef.current = chainId;
  }, [chainId]);

  useEffect(() => {
    connectedAddressRef.current = connectedAddress;
  }, [connectedAddress]);

  useEffect(() => {
    connectedChainRef.current = connectedChain;
  }, [connectedChain]);

  useEffect(() => {
    setIsMobile(props.isMobile);
    if (props.currentConnection){
      setProviderInstance(props.currentConnection.providerInstance);
      let address = formatAddress(props.currentConnection.connectedAddress);
      setDisplayAddress(address);
      setConnectedAddress(props.currentConnection.connectedAddress);
      setChainId(props.currentConnection.chainId);
      if (props.currentConnection.connectedChain == 'unsupported'){
        wrongNetwork();
      } else {
        setQuery({status: null});
        setError({status: null, code: null});
        setConnectedChain(props.currentConnection.connectedChain);
        alreadyClaimed(props.currentConnection);
      }
    }
  }, [props]);

  // if user has already claimed for network X, and this is the current connection,
  // this shows error message and removes/hides button for claiming
  const alreadyClaimed = async(currentConnection) => {
    setQuery({status: 'get-claim-status'});
    const claimStatus = getClaimStatus(currentConnection);
    claimStatus.then((res) => {
      setIsClaimed(res);
      for (const [stateId, status] of Object.entries(res)){
        if (status && currentConnection.chainId == stateChainIds[stateId]){
          setError({status: 'alreadyClaimed', code: 318});
          setQuery({status: 'error'});
          break;
        } else {
          setQuery({status: 'idle'});
        }
      }
    });
  }

  const addFuseNetwork = async(id) => {
    setQuery({status: "loading-connect", code: null});
    providerInstance.eth.currentProvider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: id,
        chainName: 'Fuse Mainnet',
        nativeCurrency: {
          name: 'Fuse',
          symbol: 'FUSE',
          decimals: 18
        },
          rpcUrls: ['https://rpc.fuse.io'],
          blockExplorerUrls: ['https://explorer.fuse.io']
        }],
    }).catch((err) => {
        setQuery({status: 'error'});
        setError({status: '', code: err.code});
    });
  }

  // Switching of network by button
  const switchNetwork = useCallback(async (chainId, stateId) => {
    if (!isClaimed[stateId]){
      await providerInstance.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainId}]
      }).catch((err) => {
        // console.log('err switch -->', err);
        if (err.code == 4902){
          addFuseNetwork(chainId);
        } else {
          setError({status: null, code: err.code});
        }
      });
    }  
  }, [chainId, providerInstance, isClaimed, addFuseNetwork]);

  const wrongNetwork = () => {
    setError({status: 'wrongNetwork', code: 310});
    setQuery({status: 'error'});
    setConnectedChain('unsupported');
    setChainId('0x00');
  }

  // Callback from claimDialog to load claim component
  const getReputation = useCallback((chainId) => {
    props.getRep(chainId);
  }, [chainId, props.getRep]);

  // TODO: maybe change HTML markup. . .
  return (
    <Grid container spacing={0.25} sx={{justifyContent: "center"}} columnSpacing={{xs: 0.125}}>
      <Grid item xs={4} sx={{borderRight: "1px solid rgba(128,128,128,0.4)", 
                             display:"flex",
                             flexDirection:"column",
                             alignItems:"center"}}>
        <Typography variant="h6" 
                    gutterBottom 
                    component="div" 
                    sx={{fontWeight: "normal", 
                         mt: 0.25, 
                         mb: 0.25, 
                         ml: isMob ? -6.25 : -3.125, 
                         fontSize: "1rem"}}>
          Connected Address
        </Typography>
        <Typography variant="span" sx={{fontStyle: "italic", 
                                        fontWeight: "bold",
                                        mr: isMob ? 4 : 0,}}>
          {displayAddress} 
        </Typography>
      </Grid>
      <Grid item xs={4} sx={{ml:1.6}}>
        <Typography variant="h6" 
                        gutterBottom 
                        component="div" 
                        sx={{fontWeight: "normal", 
                             mt: isMob ? 0 : 0.25, 
                             mb:0.25, 
                             ml: isMob ? 0 : 3.125, 
                             fontSize: "1rem"}}>
          on Network
        </Typography>
        <Typography variant="span" 
                    sx={{fontStyle: "italic", fontWeight: "bold"}}>
          {connectedChain} 
        </Typography>
      </Grid>
      <Divider />
      <Typography variant="span" sx={{textAlign: "center", mt: 2}}>
        Make sure you are connected to the network for which 
        you want to claim (Blue): 
      </Typography>
        <br />
      <Grid item xs={4} sx={{display:"flex", justifyContent:"center",alignItems:"center"}}>
          <SwitchAndConnectButton
            fullWidth
            variant="contained"
            className={` ${chainId == 1 ? "chain-connected" : ""} ` + 
                      ` ${isClaimed.productionMain ? "chain-claimed" : ""} `
            }
            sx={{
              mt: 3,
              mb: 2,
              backgroundImage: `url('/ethereum.svg')`,
            }}
            onClick={() => switchNetwork("0x1", "productionMain")}>
              {isClaimed.productionMain ? <span>Claimed!</span> : ""}
            </SwitchAndConnectButton>
      </Grid>
      <Grid item xs={4} sx={{display:"flex", justifyContent:"center",alignItems:"center"}}>
        <SwitchAndConnectButton
            fullWidth
            variant="contained"
            className={` ${chainId == 122 ? "chain-connected" : ""} ` +  
                      ` ${isClaimed.production ? "chain-claimed" : ""}`
            }
            sx={{
              mt: 3,
              mb: 2,
              backgroundImage: `url('/fuse.svg')`
            }}
            onClick={() => switchNetwork("0x7a", "production")}>
              {isClaimed.production ? <span>Claimed!</span>: ""}
            </SwitchAndConnectButton>
      </Grid>             
      {
        query.status === 'error' && (error.status === "wrongNetwork" || error.status === "alreadyClaimed") ? 
          <ErrorHandler action={error}/>
        :
        query.status === 'get-claim-status' ?
          <div style={{
            display: "flex",
            alignItems: 'center',
            flexDirection: "column",
          }}>
            <CircularProgress color="secondary" sx={{marginTop:"20px"}} />
            <Typography variant="span" sx={{fontStyle: "italic", 
                                            textAlign:"center", 
                                            marginTop: "5px"}} color="red">
                We are checking your reputation balance, please wait a moment.
            </Typography>
          </div>
        :
        <Box>
          <Button
            fullWidth
            variant="contained"
            sx={{
              mt: 3, 
              mb: 2, 
              backgroundColor: "#00C3AE", 
                '&:hover': {
                  backgroundColor: "#049484"
            }}}
            onClick={getReputation}>
              Claim your tokens
          </Button>
      </Box>
      }
    </Grid>
  )
}
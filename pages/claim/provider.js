import React, {useState, useEffect, useRef, useCallback} from 'react';
import Box from "@mui/material/Box";
import CircularProgress from '@mui/material/CircularProgress';
import Typography from "@mui/material/Typography";

import WalletConnectProvider from "@walletconnect/web3-provider";
const Web3 = require('web3');
const infuraConfig = require('../../private/infura.config.js');
let testUrl = infuraConfig.infuraUrl;

import SwitchAndConnectButton from '../../lib/switchConnectButton.js';
import ErrorHandler from './ErrorHandler.js';
import walletConnect, {isConnected} from '../../lib/connect.serv.js';

/**
 * Provider component for letting a user connect its wallet through MetaMask/WalletConnect
 * @notice on mount, checks if user is connected already. If connected, initalization starts auto, 
 * and loads up switch Component through props callback function from claimDialog
 * @param props contains: callback function to claimDialog. ClaimAddress.
 * and query with a status object (used when disconnecting); 
 */

export default function Provider(props) {
  const [initProvider] = useState('init');
  const [providerInstance, setProviderInstance] = useState(null);
  const [query, setQuery] = useState({status: 'init'});
  const [error, setError] = useState({status: null, code: null});

  const providerInstanceRef = useRef(providerInstance);
  const claimAddressRef = useRef(props.claimAddress);
  const queryRef = useRef(query);

  useEffect(() => {
    providerInstanceRef.current = providerInstance;
  }, [providerInstance]);

  useEffect(() => {
    claimAddressRef.current = props.claimAddress;
  }, [props.claimAddress]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // list of error codes, status/action can be viewed in ErrorHandler
  let queryConnectionErrors = [4001,311,312,-32002,313].join(":");
  let connectionErrorsTimeout = [4001,311,-32002,313].join(":");

  useEffect(() => {
    if (props.query.status == 'disconnect') { 
      disconnect();
    } else {
      let getCurrentConnection = isConnected(props.claimAddress);
      getCurrentConnection.then((res) => {
        if (res) {
          success(res);
        }
      }).catch((err) => {
        errorInit(err);
      });
    }
  }, [initProvider]);
  
  const connectForClaim = useCallback(async(providerName) => {
    // Provider {
    //     "MM" for METAMASK
    //     "WC" for WalletConnect
    // }
    setQuery({status: 'loading-connect'});
    let conAddr;
    if (!providerInstanceRef.current && providerName == "MM"){
      // user is not connected yet
      const web3 = new Web3(Web3.givenProvider || testUrl);
      conAddr = walletConnect(providerName, web3, claimAddressRef.current);
    } else if (!providerInstanceRef.current && providerName == "WC"){
      const Wc3 = new WalletConnectProvider({
        infuraId: infuraConfig.infuraId,
        rpc: {
          1: infuraConfig.infuraUrl,
          122: infuraConfig.pocketUrl,
        },
      });
      const web3wc = new Web3(Wc3);
      conAddr = walletConnect(providerName, web3wc, claimAddressRef.current);

      // Temporary solution for when a user manually cancels the confirmation.(pending promise, no resolve)
      // so always reset query status after 30 sec
      setTimeout(() => {
        setQuery({status:'init'});
      }, 30000);
    }

    conAddr.then((res) => {
      setProviderInstance(res.providerInstance);
      success(res);
    }).catch((err) => {
      console.log('conAddr error -->', err);
      errorInit(err);
    });
  },[setQuery, setProviderInstance]);

  const wrongNetwork = (res) => {
    if (query.status !== 'success') {
      success(res);
    };
  }

  const disconnect = () => {
    setProviderInstance(null);
    setTimeout(() => {
      setQuery({status: 'error'});
      setError({status: props.query.status, code: props.query.code});
    }, 1);

    if (connectionErrorsTimeout.indexOf(props.query.code) !== -1) {
      setTimeout(() => {
        setQuery({action: 'idle', code: null});
        setError({status: null, code: null});
      }, 2500);
    }
  }

  const wrongAddress = (res) => {
    setProviderInstance(res.providerInstance);
    if (res.providerName == "MM"){
      res.providerInstance.currentProvider.on('accountsChanged', (res) => {
        providerInstanceRef.current.currentProvider.removeAllListeners();
        disconnect();
      });
    } else {
      res.providerInstance.currentProvider.on("disconnect", (code, res) =>{
        providerInstanceRef.current.currentProvider.removeAllListeners();
        disconnect();
      });
    }
  }

  const errorInit = (err) => {
    err.code == 310 ? 
      wrongNetwork(err.res) 
    :
    err.code == 312 ?
      wrongAddress(err.res)
    :
      err.message == 'User closed modal' ? err.code = 311 : null;
      setQuery({status: 'error'});
      setError({status: '', code: err.code});
      if (connectionErrorsTimeout.indexOf(err.code) !== -1) {
        setTimeout(() => {
          setQuery({action: 'idle', code: null});
          setError({status: null, code: null});
        }, 2500);
      }
  }

  /* 
   * setConnection returns User to ClaimDialog and Provider gets unmounted 
   */
  const success = (res) => {
    setQuery({status: 'success'});
    props.setConnection(res); 
  }

  return (
    query.status === 'loading-connect' ?
    <div style={{display: "flex", alignItems:"center", flexDirection:"column"}}>
      <CircularProgress color="secondary" sx={{marginTop:"20px"}} /> <br />

      <Typography variant="span" sx={{fontStyle: 'italic'}}>
        We are trying to connect, if anything goes wrong, this will reset after 30 seconds.
      </Typography>
    </div>  
    :   
    queryConnectionErrors.indexOf(error.code) !== -1 && queryRef.current.status == 'error' ?
      <ErrorHandler action={error}/> 
    :
    <Box sx={{
      marginTop: "20px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <SwitchAndConnectButton
        fullWidth
        variant="contained"
        sx={{
            backgroundImage: `url('/metamask.svg')`, 
            marginRight: "40px"
        }}
        onClick={() => connectForClaim("MM")}></SwitchAndConnectButton>
      <SwitchAndConnectButton
        fullWidth
        variant="contained"
        sx={{
            backgroundImage: `url('/walletconnect.svg')`, 
        }}
        onClick={() => connectForClaim("WC")}></SwitchAndConnectButton>
    </Box>
  )
}
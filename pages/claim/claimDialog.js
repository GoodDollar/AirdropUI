import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import React, { useState, useEffect, useRef, useCallback} from 'react';

import Provider from './provider.js';
import Switch from './switch.js';
import Claim from './claim.js';
import MobileInfo from './mobileInfo';
import isMobileHook from '../../lib/isMobile';

/**
 * parent dialog for provider & switch component
 * @notice provider events initialized here to properly send user to the right component tab
 * @param props contains the proofdata and dialog open/close methods
 */

export default function ClaimDialog(props) {
  const [claimAddress, setClaimAddress] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [initClaim] = useState('init');
  const {onClose, open} = props;
  const [query, setQuery] = useState({status: 'init'});
  const [gRep, setGRep] = useState(null);
  const [currentConnection, setCurrentConnection] = useState(null);
  const [providerEvents, setProviderEvents] = useState({status: null});
  const [providerName, setProviderName] = useState('init');

  const isMobile = isMobileHook();
  
  useEffect(() => {
    let gRep = props.proofData.reputationInWei / 1e18;
    setGRep(gRep);
    setClaimAddress(props.proofData.addr);
    if (props.proofData.addr !== connectedAddress){
      setCurrentConnection(null);
      setConnectedAddress(null);
    }
  }, [initClaim, props]);

  const handleClose = useCallback(() => {
    if (query.status == 'disconnect'){
      setQuery({status: 'init'});
    }
    onClose();
  }, [onClose, query]);

  useEffect(() => {
    if (providerEvents.status == 'init') {
      if (currentConnection.providerName == "MM" || currentConnection.providerName == "WC") {
        let supportedChains = ['0x7a', '0x1', 1, 122].join(':');
        currentConnection.providerInstance.currentProvider.on('chainChanged', (chainId) => {
          if (supportedChains.indexOf(chainId) !== -1) {
            const updateConnection = {
              providerName: currentConnection.providerName,
              connectedAddress: currentConnection.connectedAddress,
              connectedChain: (chainId == "0x7a" ? "Fuse": "Ethereum Mainnet"),
              chainId: (chainId == "0x7a" ? 122 : 1),
              providerInstance: currentConnection.providerInstance
            }
            setCurrentConnection(updateConnection);
            setConnectedAddress(currentConnection.connectedAddress);
            setQuery({status: 'connected'});
          } else {
            const updateConnection = {
              providerName: currentConnection.providerName,
              connectedAddress: currentConnection.connectedAddress,
              connectedChain: 'unsupported',
              chainId: '0x00',
              providerInstance: currentConnection.providerInstance
            }
            setCurrentConnection(updateConnection);
            setConnectedAddress(currentConnection.connectedAddress);
            setQuery({status: 'connected'});
          }
        });
        currentConnection.providerInstance.currentProvider.on('accountsChanged', (res) => {
          console.log('disconnecting . . .');
          currentConnection.providerInstance.currentProvider.removeAllListeners();
          if (res.length === 0 || res[0] !== claimAddress) {
            let status = {status: 'disconnect', code: 313};
            setQuery(status);
            setProviderName(null);
            setConnectedAddress(null);
            setCurrentConnection(null);
          }
        });

        currentConnection.providerInstance.currentProvider.on("disconnect", (code, res) =>{
          // code 1000 == disconnect
          currentConnection.providerInstance.currentProvider.removeAllListeners();
          let status = {status: 'disconnect', code: 313};
          setQuery(status);
          setProviderName(null);
          setCurrentConnection(null);
          setConnectedAddress(null);
        });
      }
    }
  }, [providerEvents]);

  // Callback function for Provider function
  const connectionHandler = useCallback(async(res) => {
    if (res.status == 'error'){
      // TODO: Not showing disconnect message properly, shows cached old error message
      setCurrentConnection(null);
      setQuery(res);
      setConnectedAddress(null);
      setProviderName('init');
    } else {      
      setCurrentConnection(res);
      setProviderEvents({status: 'init'});
      setConnectedAddress(res.connectedAddress);
      setProviderName(res.providerName);
      setQuery({status: 'connected'});
    }
  },[setQuery, setProviderName, setConnectedAddress, setProviderEvents, setCurrentConnection]);

  const getReputation = useCallback(() => {
    setQuery({status: 'claiming'});
  }, [setQuery]);

  const backToSwitch = useCallback(() => {
    setQuery({status: 'connected'});
  }, [setQuery]);

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogContent 
        className="dialogContentContainer" 
        sx={{
          width: isMobile ? "100%" : "500px",
          height: "max-content",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>

          <MobileInfo isMobile={isMobile} providerName={providerName} initClaim={initClaim}/>
        
        <DialogTitle sx={{fontStyle:"italic", mt: 1, pt:0}}>You have {gRep} GOOD Tokens to claim!</DialogTitle>
        { !connectedAddress || query.status === 'disconnect' ?
            <Provider claimAddress={claimAddress} 
                      setConnection={connectionHandler}
                      query={query} />
          :
          query.status === 'connected' ?
            <Switch proofData={props.proofData} 
                    currentConnection={currentConnection} 
                    getRep={getReputation}
                    isMobile={isMobile} />
          :
          query.status !== 'init' ?
            <Claim proofData={props.proofData} currentConnection={currentConnection}
                   toSwitch={backToSwitch}
                   isMobile={isMobile} />
          :
          null
        }
      </DialogContent>
    </Dialog>
  )
}
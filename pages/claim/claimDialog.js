import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import React, { useState, useEffect, useCallback} from 'react';
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";

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
  const [initClaim, setInitClaim] = useState('init');
  const {onClose, open} = props;
  const [query, setQuery] = useState({status: 'init'});
  const [gRep, setGRep] = useState(null);
  const [currentConnection, setCurrentConnection] = useState(null);
  const [providerEvents, setProviderEvents] = useState({status: null});
  const [providerName, setProviderName] = useState('init');
  const [currentStep, setCurrentStep] = useState({step: 'step1', message: ''});

  const isMobile = isMobileHook();

  let steps = {
    step1: 'Step 1/4: Connect eligible address',
    step2: 'Step 2/4: Confirm airdrop network',
    step3: 'Step 3/4: Confirm airdrop recipient',
    step4: 'Step 4/4: Confirm and claim'
  }

  useEffect(() => {
    for (const [step, message] of Object.entries(steps)) {
      if (currentStep.step == step){
        setCurrentStep({step: step, message: message});
      }
    }
  }, [query]);
  
  useEffect(() => {
    if (initClaim == 'init'){
      setInitClaim("loaded");
      let gRep = props.proofData.reputationInWei / 1e18;
      setGRep(gRep);
      setClaimAddress(props.proofData.addr);
    }
    if (props.proofData.addr !== connectedAddress){
      setCurrentConnection(null);
      setConnectedAddress(null);
    }
  }, [setInitClaim, props]);

  const handleClose = useCallback(() => {
    if (query.status == 'disconnect'){
      setQuery({status: 'init'});
      setInitClaim('init');
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
              connectedChain: (chainId == "0x7a" ? "Fuse": "Ethereum"),
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
      setCurrentStep({step: 'step2'});      
      setCurrentConnection(res);
      setProviderEvents({status: 'init'});
      setConnectedAddress(res.connectedAddress);
      setProviderName(res.providerName);
      setQuery({status: 'connected'});
    }
  },[setQuery, setProviderName, setConnectedAddress, setProviderEvents, setCurrentConnection]);

  const getReputation = useCallback(() => {
    setCurrentStep({step: 'step3'});
    setQuery({status: 'claiming'});
  }, [setQuery]);

  const backToSwitch = useCallback(() => {
    setCurrentStep({step: 'step2'});
    setQuery({status: 'connected'});
  }, [setQuery]);

  const updateStep = useCallback(async(step) => {
    setCurrentStep({step: step});
    setQuery({status: 'claiming'});
  }, []);

  return (
    <Dialog onClose={handleClose} open={open} sx={{margin: isMobile ? 2 : 4}}>
      <DialogContent 
        className="dialogContentContainer" 
        sx={{
          width: isMobile ? "100%" : "500px",
          height: "max-content",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          borderLeft: "11px solid #1976d2"
        }}>

          <MobileInfo isMobile={isMobile} providerName={providerName} initClaim={initClaim}/>
        <DialogTitle sx={{fontStyle:"italic", mt: 1, pt:0, width: "80%", fontSize: "1.10rem"}}>
          {currentStep.message}
        </DialogTitle>
        {
          currentStep.step == 'step4' ? 
            <Box>
              <Typography variant="span" sx={{fontStyle: "italic", mt: 1, pt:0, width: "80%"}}>
                You're claiming {gRep} GOOD!
              </Typography>
            </Box> : null
        }
        { !connectedAddress || query.status === 'disconnect' ?
          <Box>
            <List sx={{display: "flex", flexDirection:"column"}}>
              <ListItem sx={{justifyContent: "center", alignItems: "center"}}>
                <Typography variant="span" sx={{fontStyle: "italic", mt: 1, pt:0, width: "80%"}}>
                  You have {gRep} GOOD to claim!
                </Typography>
              </ListItem>
              <ListItem sx={{justifyContent: "center", alignItems: "center"}}>
                <Provider claimAddress={claimAddress} 
                        setConnection={connectionHandler}
                        query={query} />
              </ListItem>
            </List>
          </Box>
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
                   updateStep={updateStep}
                   isMobile={isMobile} />
          :
          null
        }
      </DialogContent>
    </Dialog>
  )
}
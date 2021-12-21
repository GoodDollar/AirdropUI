import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, {useState, useEffect, useCallback} from 'react';
import Container from "@mui/material/Container";
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';


import CheckMarkDone from '../../lib/checkMarkDone.js';
import {setNewRecipient, claimReputation, getRecipient, getPendingTXStatus, formatAddress} from '../../lib/connect.serv.js';


const isEth = /^0x[a-fA-F0-9]{40}$/;

/**
 * Claim component. For setting a new recipient (optional), 
 * and claim the GOOD tokens for connected network
 * @param props contains: proofData array, currentConnection Object, callback backToSwitch, 
 * isMobile boolean
 * 
 */
export default function Claim(props){
  const [proof, setProof] = useState(null);
  const [connectionDetails, setConnectionDetails] = 
        useState({connectedChain: null, connectedAddress: null});
  const [query, setQuery] = useState({status: 'init'});
  const [repRecipient, setRepRecipient] = useState(null);
  const [contractInstance, setContractInstance] = useState(null);
  const [isMob, setIsMobile] = useState(null);
  const [newRecValue, setNewRecValue] = useState(null);

  useEffect(() => {
    setIsMobile(props.isMobile);
    setProof(props.proofData);
    getRec(props.currentConnection);
    setConnectionDetails(props.currentConnection);
  }, [props]);

  /** 
   * @dev_notice Empty Address when no new recipient has been set yet. Default(Eligible) _user is used
  **/
  const getRec = useCallback(async(currentConnection) => {
    const getRecc = await getRecipient(contractInstance, currentConnection);
    setContractInstance(getRecc.contractInstance);
    const emptyAddress = /^0x0+$/.test(getRecc.recipient);
    let recipient = emptyAddress ? currentConnection.connectedAddress : getRecc.recipient,
        formatRecipient = formatAddress(recipient);

    setRepRecipient(formatRecipient);
    let pendingTXClaim = JSON.parse(localStorage.getItem('pendingClaim')),
        pendingTXNewRec = JSON.parse(localStorage.getItem('pendingNewRec'));
    if (pendingTXClaim || pendingTXNewRec) {
      setQuery({status: "pending"});
      let pendingTXStatus = setInterval(() => {
        const txStatus = getPendingTXStatus(currentConnection, pendingTXClaim ?? pendingTXNewRec);
        txStatus.then(async(res) => {
          if (res) {
            const getNewRec = await getRecipient(contractInstance, currentConnection);
            let recipient = formatAddress(getNewRec.recipient);
            setContractInstance(getNewRec.contractInstance);
            setRepRecipient(recipient);
            setQuery({status: "claim-init"});
            clearInterval(pendingTXStatus);
          }
        });
      }, 7000);
    }
  }, [connectionDetails, setRepRecipient, setQuery, setContractInstance]);

  const changeRecipient = useCallback(async(e) => {
    e.preventDefault();
    if (!isEth.test(e.target[0].value)){
      return;
    } else {
      let newRecipient = e.target[0].value;
      setQuery({status: 'pending'});
      const newRecipientSet = setNewRecipient(contractInstance, 
            connectionDetails, 
            newRecipient);    
      newRecipientSet.then((res) => {
        if (res.code == 4001){
          setQuery({status: 'init'});
        } else {
          getRec(connectionDetails);
        }
      }).catch((err) => {
        setNewRecValue('0x00');
        setQuery({status: 'init'});
        return;
      });
    }
  }, [getRec, setNewRecValue, setQuery, setNewRecipient, connectionDetails, contractInstance]);

  const backToSwitch = useCallback(() => {
    props.toSwitch();
  },[props.toSwitch]);

  const backToRecipient = useCallback(() => {
    setQuery({status: 'init'});
  }, [setQuery]);

  const skipAndClaim = useCallback(() => {
    getRec(connectionDetails);
    setQuery({status: 'claim-init'});
  }, [connectionDetails, setQuery, getRec]);
  
  const claimRep = useCallback(async() => {
    setQuery({status: 'claim-start'});
    const claim = await claimReputation(proof, connectionDetails, contractInstance);
    if (claim?.code) {
      setQuery({status: 'claim-failed'});
      setTimeout(() => {
        setQuery({status: 'claim-init'});
      }, 2000);
    } else {
      setQuery({status: 'claim-success'});
      localStorage.removeItem("pendingClaim");
    }
  }, [connectionDetails, contractInstance, setQuery]);

  return (
    <Container component="claim">
      <Box sx={{
        mb: 4,
        display: "flex",
        justifyContent:"center"
      }}>
        <Button 
          variant="contained"
          sx={{
            mr: 1,
            mb: isMob ? 1 : 0,
            backgroundColor: "#9c27b0",
           '&:hover': {
              backgroundColor: "#60156c"
            }
          }}
          onClick={backToSwitch}
        >Switch Network</Button>
        {
          query.status === "claim-init" ?
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#9c27b0",
                '&:hover': {
                  backgroundColor: "#60156c"
                },
                mb: isMob ? 1 : 0,
              }}
              onClick={backToRecipient}
            >Change Recipient</Button>
          : null
        }
      </Box>
      <Grid container spacing={2} sx={{justifyContent:"center", marginLeft: "-32px"}}>
        <Grid item sx={4} 
              sx={{
                borderRight: '1px solid rgba(128,128,128,0.4)', 
                paddingRight: "8px"}}>
          <Typography paragraph={true}>
            Connected Network <br />
            <Typography variant="span" sx={{fontWeight: 'bold'}}>
              {connectionDetails.connectedChain}
            </Typography>      
          </Typography>
        </Grid>
        <Grid item sx={4}>
          <Typography paragraph={true}>
            Recipient <br />
            <Typography variant="span" sx={{fontWeight: 'bold'}}>
              {repRecipient}
            </Typography>
          </Typography>
        </Grid>
      </Grid>
      {
        query.status === 'init' ?
          <div>
            <Box
            component="form"
            onSubmit={changeRecipient}
            sx={{mt: 1}}
            >
            <Typography paragraph={true} sx={{textAlign:"center"}}>
              If you want to receive your GOOD tokens on a different address, 
              set a new recipient below.
            </Typography>
            <Typography paragraph={true} sx={{textAlign:"center", mb: 0}} color="red">
              REMEMBER TO ONLY USE ADDRESSESS WHICH ARE YOUR OWN AND SUPPORT ERC-20's
            </Typography>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <TextField
                error={!isEth.test(newRecValue)}
                helperText={!isEth.test(newRecValue) ? "This is either not a ETH address, or it doesn't exist" : ''}
                margin="normal"
                required
                id="newRecipient"
                label="New Recipient"
                name="newRecipient"
                onChange={(e) => setNewRecValue(e.target.value)}
                sx={{mr: 1}} />
              <Button 
                type="submit"
                variant="contained"
                sx={{
                  fontSize: '13px', 
                  mt: 3, 
                  mb: (!isEth.test(newRecValue) ? 7.5 : 2),
                  backgroundColor: "#00C3AE", 
                  '&:hover': {
                    backgroundColor: "#049484"
                  }
                }}
                >Set New Recipient</Button>

            </div>
          </Box>
          <Button
              variant="contained"
              sx={{ mt: 0.5, mb: 2}}
              onClick={skipAndClaim}
            >Skip</Button>
          </div>
        :
        query.status === 'pending' ?
          <div style={{
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
          }}>
            <CircularProgress color="secondary" sx={{marginTop:"20px"}} /> <br />
            <Typography variant="span" sx={{fontStyle: 'italic'}} color="red">
                You have a current pending transaction, please wait till confirmation.
            </Typography>
          </div> 
        :
        query.status !== 'claim-init' ?
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column'
          }}>
            <CheckMarkDone 
              className={`${query.status === 'claim-success' ||  
                            query.status === 'claim-failed' ? "load-complete" : ""}` +
                            " circle-loader "}>
              <CheckMarkDone 
                className={ `${query.status === 'claim-success' ? "done" : ""}` +
                            `${query.status === 'claim-start' || 
                               query.status === 'claim-success' ? " checkmark draw " : ""}` +
                            `${query.status === 'claim-failed' ? " check-x draw failed " : ""}`}/>
            </CheckMarkDone>

            <Typography variant="span" sx={{fontWeight: "bold", color: "rgb(156, 39, 176);"}}>
              {
                query.status === 'claim-start' ?
                  "Your GOOD is being claimed . . ." :
                query.status === 'claim-success' ?
                  "You have succefully claimed your GOOD!" :
                  "You cancelled your transaction"
              }
            </Typography>
          </Box>

        :   
        <Box>
          <Button
            variant="contained"
            fullWidth
            sx={{
              mt:3, 
              mb:2,
              backgroundColor: "#00C3AE", 
                '&:hover': {
                  backgroundColor: "#049484"
                }
            }}
            onClick={claimRep}
          > claim your tokens
          </Button>
        </Box>
      }
    </Container> 
  )
}
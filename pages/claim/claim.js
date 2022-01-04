import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, {useState, useEffect, useCallback} from 'react';
import Container from "@mui/material/Container";
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";

import CheckMarkDone from '../../lib/checkMarkDone.js';
import {setNewRecipient, claimReputation, getRecipient, getPendingTXStatus, formatAddress} from '../../lib/connect.serv.js';

const isEth = /^0x[a-fA-F0-9]{40}$/;

/**
 * Claim component. For setting a new recipient (optional), 
 * and claim the GOOD tokens for connected network
 * @param props contains: proofData array, currentConnection Object, callback backToSwitch, 
 * isMobile boolean 
 */
export default function Claim(props){
  const [proof, setProof] = useState(null);
  const [connectionDetails, setConnectionDetails] = 
        useState({connectedChain: null, connectedAddress: null});
  const [query, setQuery] = useState({status: 'init'});
  const [repRecipient, setRepRecipient] = useState(null);
  const [repRecipientFormat, setRepRecipientFormat] = useState(null);
  const [contractInstance, setContractInstance] = useState(null);
  const [isMob, setIsMobile] = useState(null);
  const [newRecValue, setNewRecValue] = useState(null);
  const [changeRecOpen, setChangeRecOpen] = useState(false);

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

    setRepRecipient(recipient);
    setRepRecipientFormat(formatRecipient);
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
            setRepRecipient(getNewRec.recipient);
            setRepRecipientFormat(recipient);
            setQuery({status: "claim-init"});
            clearInterval(pendingTXStatus);
          }
        });
      }, 7000);
    }
  }, [connectionDetails, setRepRecipientFormat, setRepRecipient, setQuery, setContractInstance]);

  const changeRecipient = useCallback(async(e) => {
    e.preventDefault();
    if (!isEth.test(e.target[0].value || e.target[0].value == repRecipient)){
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
    props.updateStep('step3');
    setQuery({status: 'init'});
    showChangeRecipient(changeRecOpen);
  }, [setQuery]);

  const skipAndClaim = useCallback(() => {
    props.updateStep('step4');
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

  const showChangeRecipient = useCallback((status) => {
    setChangeRecOpen(!status);
  }, [setChangeRecOpen]);

  return (
    <Container component="claim" sx={{display: "flex", alignItems: "center", flexDirection:"column", mt: 4}}>
      <Grid container spacing={2} sx={{justifyContent:"center", 
                                       ml: 0,
                                       width: isMob ? "110%" : "inherit"}}>
        <Paper sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "1px solid rgba(128,128,128,0.26)",
                paddingTop: 3,
                paddingBottom: 3
        }}>
          <Grid item xs={6} 
                sx={{
                  borderRight: '1px solid rgba(128,128,128,0.4)', 
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "max-content",
                  }}>
            <List sx={{padding: 0,
                       display: "flex",
                       flexDirection: "column",
                       justifyContent: "center",
                       alignItems: "center",
                       width: "max-content"}}>
              <ListItem sx={{flexDirection: "column-reverse", 
                              padding: 0,
                              margin: 0}}>
                <ListItemAvatar sx={{display: "flex", justifyContent: "center", height: "50px"}}>
                  <Avatar sx={{mr:0, paddingRight:0}}>
                    <Box sx={{background: connectionDetails.chainId == 122 ? "url(/fuse.svg)" : "url(/ethereum.svg)",
                          width: "50px",
                          height: "50px",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: connectionDetails.chainId == 122 ? "100px" : "70px",
                          backgroundPosition: connectionDetails.chainId == 122 ? "10px 8px" : "-15px 10px",
                          display: "flex",
                          justifySelf: "center",
                          alignSelf: "center",
                          borderRadius: "5px"
                    }}/>
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={"Network"} sx={{margin: 0, 
                                                       padding: 0, 
                                                       paddingBottom: "10px"}}>
                </ListItemText>
              </ListItem>
              <ListItem sx={{margin: 0, padding: 0}}>
                <Box sx={{display: "flex", justifyContent:"center"}}>
                  <Button variant="contained"
                      sx={{margin: 0,
                        mb: isMob ? 1 : 0,
                        backgroundColor: "#9c27b0",
                        '&:hover': {
                          backgroundColor: "#60156c"
                        },
                        fontSize: isMob ? "11px" : "12px"
                      }}
                      onClick={backToSwitch}>Switch Network</Button>

                </Box>
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={6} sx={{height: "max-content",
                                 display: "flex",
                                 justifyContent: "center",
                                 alignItems: "center"}}>
            <List sx={{padding: 0,
                       display: "flex",
                       flexDirection: "column"}}>
              <ListItem sx={{padding: 0, flexDirection: "column"}}>
                <Typography paragraph={true} 
                            sx={{padding: 0,
                                 paddingLeft: 0, 
                                 height: "max-content", 
                                 mb:0,
                                 paddingBottom: "10px"}}>
                  Recipient <br />
                </Typography>
                <Typography paragraph={true} sx={{fontWeight: "bold",
                                                  margin: 0,
                                                  padding: 0,
                                                  height: "50px",
                                                  pt: 0.5
                                                  }}>
                  {repRecipientFormat}
                </Typography>
              </ListItem>
              <ListItem sx={{margin: 0, padding: 0}}>
                <Button
                    variant="contained"
                    sx={{
                      mr: 1,
                      mb: isMob ? 1 : 0,
                      backgroundColor: "#9c27b0",
                        '&:hover': {
                            backgroundColor: "#60156c"
                      },
                      fontSize: isMob ? "11px" : "12px"
                    }}
                    onClick={query.status == 'claim-init' ?
                            backToRecipient : 
                            () => showChangeRecipient(changeRecOpen) 
                    }
                    >Change Recipient</Button>
              </ListItem> 
            </List>
          </Grid>
        </Paper>
      </Grid>
      {
        query.status === 'init' && changeRecOpen ?
          <div>
            <Box
            component="form"
            onSubmit={changeRecipient}
            sx={{mt: 3}}
            >
            <Typography paragraph={true} sx={{textAlign:"center"}}>
            Set a different recipient for your GOOD tokens.<br />
            Notice: every future GOOD minted to <b>{repRecipientFormat}</b>  <br />
            will be minted instead to the new recipient until you change it back.
            </Typography>
            <Typography paragraph={true} sx={{textAlign:"center", mb: 0}} color="red">
              REMEMBER TO ONLY USE ADDRESSESS WHICH SUPPORT ERC-20's
            </Typography>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <TextField
                error={!isEth.test(newRecValue) || newRecValue == repRecipient}
                helperText={!isEth.test(newRecValue) ? 
                            "This is either not a ETH address, or it doesn't exist." : 
                            newRecValue == repRecipient ? 
                            "This address is the current recipient." :
                            ''}
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
                  mt: isMob ? 0.5 : 3, 
                  mb: (!isEth.test(newRecValue) ||
                       newRecValue == repRecipient ? 7.5 : 2),
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
              sx={{ mt: 4, mb: 2}}
              onClick={skipAndClaim}
            >Next
          </Button>
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
        query.status == 'claim-start' ?
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            mt: 3
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
        query.status == 'init' ? 
          <Button
              variant="contained"
              sx={{ mt: 4, mb: 2}}
              onClick={skipAndClaim}
            >Next
          </Button>
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
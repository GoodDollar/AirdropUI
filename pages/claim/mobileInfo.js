import React, { useState } from 'react';
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

export default function MobileInfo() {
  const [isActive, setIsActive] = useState(false);
  const [diaOpen, setOpen] = useState(false);

  const showInfo = (active) => {
   active ? setIsActive(false) : setIsActive(true);
   active ? setOpen(false) : setOpen(true);
  }

  const handleClose = () => {
    setOpen(false);
    setIsActive(false);
  }

  return (
    <div style={{
          border: "2px solid red",
          padding: "5px",
          borderRadius: "50px",
          width: "35px",
          height: "35px",
          fontSize: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "red",
          float: "right",
          alignSelf: "flex-end",
    }}>
    <Button sx={{
      textTransform: "lowercase",
      fontSize: "24px",
      color: "red",
    }} 
      onClick={() => showInfo(isActive)}>i</Button>
    {isActive ?
    <Dialog onClose={handleClose} open={diaOpen}>
      <div style={{
        boxShadow: "red 0px 0px 12px 2px inset",
      }}>
        <DialogTitle color="red">Caution for Mobile/Wallet-Connect users!</DialogTitle>
          <DialogContent>
            <Box sx={{width: "95%", maxWidth: 450}}>
              <Typography variant="body1" gutterBottom>
                There are some things to be carefull with 
                when using a mobile wallet and Wallet-Connect. 
                This is due to some technical limitations.
                If you follow below points carefully, everything should work as intended!
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary={
                    "1. Always double-check the network for which you receive transaction requests." +
                    " Make sure it is the received on the network you initially connected with."
                  }/>
                </ListItem>
                <ListItem>
                  <ListItemText primary={
                    "2. You cannot switch networks with the Dapp buttons."
                  }/>
                </ListItem>
                <ListItem>
                  <ListItemText primary={
                    "3. If you manually switch networks, always end the session in the wallet" + 
                    " and then reload the page and reconnect."
                  }/>
                </ListItem>
                <ListItem>
                  <ListItemText primary={
                    "4. If you make any other changes manually in your mobile wallet," + 
                    " also the ones not listed here," +
                    " it is advised to disconnect your wallet properly (end-sessions)," + 
                    " and reload/reconnect."
                  }/>
                </ListItem>
              </List>
            </Box>
          </DialogContent>
      </div>
    </Dialog>
    : null
    } 
    </div>
  )
}
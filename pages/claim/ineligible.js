import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import React, { useState, useEffect } from 'react';

export default function IneligibleAddress(props) {
  const [sorryMessage] = useState('Sorry, this address does not have any GOOD tokens to claim. Try another');
  const {onClose, open} = props;
  const [onInit] = useState("init");

  useEffect(() => {
    setTimeout(() => {
      onClose();
    }, 2250);
  }, [onInit]);

  const handleErrorClose = () => {
    onClose();
  }

  return (
    <Dialog onClose={handleErrorClose} open={open}>
      <DialogContent 
        sx={{
          width: "500px",
          height: "max-content",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
        <DialogTitle>
          {sorryMessage}
        </DialogTitle>
      </DialogContent>
    </Dialog>
  )
}
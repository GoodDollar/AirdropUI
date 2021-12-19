import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import React, {useState, useEffect, useCallback} from 'react';
import isMobileHook from '../../lib/isMobile';


/**
 * Small dialog screen when user enters an ineligble address
 * @param props contains: open/close callbacks for dialog 
 * @returns 
 */
export default function IneligibleAddress(props) {
  const [sorryMessage] = useState('Sorry, this address does not have any GOOD tokens to claim.');
  const {onClose, open} = props;
  const [onInit] = useState("init");

  const isMobile = isMobileHook();

  useEffect(() => {
    setTimeout(() => {
      onClose();
    }, 2250);
  }, [onInit]);

  const handleErrorClose = useCallback(() => {
    onClose();
  }, [props]);

  return (
    <Dialog onClose={handleErrorClose} open={open}>
      <DialogContent 
        sx={{
          width: isMobile ? "100%" : "500px",
          height: "max-content",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
        <DialogTitle sx={{fontSize: isMobile ? "16px" : "larger"}}>
          {sorryMessage}
        </DialogTitle>
      </DialogContent>
    </Dialog>
  )
}
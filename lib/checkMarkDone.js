import { styled } from "@mui/material/styles";

let loaderSize = {size: 3.5, unit: 'em'},
    checkHeight = loaderSize.size / 2,
    checkWidth  = checkHeight / 2,
    checkLeft   = (loaderSize.size/6 + loaderSize.size/12),
    checkThick  = '3px',
    checkColor  = 'rgb(156, 39, 176)';

/**
 * @notice styled div for css animated checkmark (done and failed);
 */

const CheckMarkDone = styled('div')({
  '&.circle-loader': {
    marginBottom: '0.45em',
    border: '1px solid rgba(0,0,0,0.2)',
    borderLeftColor: checkColor,
    animation: 'loader-spin 1.2s infinite linear',
    position: 'relative',
    display: 'inline-block',
    verticalAlign: 'top',
    borderRadius: '50%',
    width: loaderSize.size + loaderSize.unit,
    height: loaderSize.size + loaderSize.unit,
    '&.load-complete': {
      animation: 'none',
      borderColor: checkColor,
      transition: 'border 500ms ease-out',
    },
    '@keyframes loader-spin': {
      '0%': {
        transform: 'rotate(0deg);',
      },
      '100%': {
        transform: 'rotate(360deg);'
      }
    },
  },
  '&.check-x': {
    display: 'none',
    '&.failed': {
      display: 'block'
    },
    '&.draw::before': {
      animationDuration: '800ms',
      animationTimingFunction: 'ease',
      animationName: 'checkmarkFailed',
      transform: 'scaleX(-1) rotate(45deg)',
    },
    '&::before': {
      opacity: 1,
      height: "1.87em",
      width: "0.775em",
      transformOrigin: 'left top',
      borderRight: checkThick + ' solid ' + checkColor,
      content: '""',
      left: "1.47em",
      top: "0.575em",
      position: 'absolute'
    },
    '&.draw::after': {
      animationDuration: '800ms',
      animationTimingFunction: 'ease',
      animationName: 'checkmarkFailed2',
      transform: 'scaleX(-1) rotate(135deg)',
    },
    '&::after': {
      opacity: 1,
      height: "1.95em",
      width: "0.93em",
      transformOrigin: 'left top',
      borderRight: checkThick + ' solid ' + checkColor,
      content: '""',
      left: "0.465em",
      top: "1.75em",
      position: 'absolute',
    },
    '@keyframes checkmarkFailed': {
      '0%': {
        height: 0,
        width: 0,
        opacity: 1,
      },
      '20%': {
        height: 0,
        width: "0.775em",
        opacity: 1,
      },
      '40%': {
        height: "1.87em",
        width: "0.775em",
        opacity: 1,
      },
      '100%': {
        height: "1.87em",
        width: "0.775em",
        opacity: 1,
      }
    },
    '@keyframes checkmarkFailed2': {
      '0%': {
        height: 0,
        width: 0,
        opacity: 1,
      },
      '20%': {
        height: 0,
        width: "0.93em",
        opacity: 1
      },
      '40%': {
        height: "1.95em",
        width: "0.93em",
        opacity: 1,
      },
      '100%': {
        height: "1.95em",
        width: "0.93em",
        opacity: 1,
      }
    }
  },
  '&.checkmark': {
    display: 'none',
    '&.done': {
      display: 'block',
    },
    '&.draw::after': {
      animationDuration: '800ms',
      aminationTimingFunction: 'ease',
      animationName: 'checkmarkDone',
      transform: 'scaleX(-1) rotate(135deg);',
    },
    '&::after': {
      opacity: 1,
      height: checkHeight + loaderSize.unit,
      width: checkWidth + loaderSize.unit,
      transformOrigin: 'left top',
      borderRight: checkThick + ' solid ' + checkColor,
      borderTop: checkThick + ' solid ' + checkColor,
      content: '""',
      left: checkLeft + loaderSize.unit,
      top: checkHeight + loaderSize.unit,
      position: 'absolute'
    },
    '@keyframes checkmarkDone': {
      '0%': {
        height: 0,
        width: 0,
        opacity: 1,
      },
      '20%': {
        height: 0,
        width: checkWidth + loaderSize.unit,
        opacity: 1,
      },
      '40%': {
        height: checkHeight + loaderSize.unit,
        width: checkWidth + loaderSize.unit,
        opacity: 1,
      },
      '100%': {
        height: checkHeight + loaderSize.unit,
        width: checkWidth + loaderSize.unit,
        opacity: 1,
      }
    }
  },

});

export default CheckMarkDone;


      // borderTop: checkThick + ' solid ' + checkColor, ----- before ???
/// <reference types="vite/client" />

declare module '@mui/material/TextField' {
  interface BaseTextFieldProps {
    slotProps?: any;
  }
  interface TextFieldProps {
    slotProps?: any;
  }
}

declare module '@mui/material/ListItemText' {
  interface ListItemTextProps {
    slotProps?: any;
  }
}

declare module '@mui/material/Dialog' {
  interface DialogProps {
    slotProps?: any;
  }
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

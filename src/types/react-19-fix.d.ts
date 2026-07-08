import React from 'react';

declare module 'react' {
  namespace JSX {
    interface Element extends React.ReactNode {}
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface Element extends React.ReactNode {}
  }
}

declare module 'react/jsx-dev-runtime' {
  namespace JSX {
    interface Element extends React.ReactNode {}
  }
}

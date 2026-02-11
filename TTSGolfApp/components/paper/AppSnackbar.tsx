/**
 * AppSnackbar — Paper Snackbar wrapper with moti slide-in
 */
import React, { memo } from "react";
import { Snackbar, type SnackbarProps } from "react-native-paper";

export interface AppSnackbarProps extends SnackbarProps {}

function AppSnackbarInner(props: AppSnackbarProps) {
  return <Snackbar {...props} />;
}

export const AppSnackbar = memo(AppSnackbarInner);

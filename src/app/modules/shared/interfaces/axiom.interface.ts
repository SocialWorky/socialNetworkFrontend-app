import { AxiomType } from "./axiom.enum";

export interface AxiomLog {
  message: string;
  component: string;
  type: AxiomType;
  error?: any;
  warning?: any;
  info?: any;
}

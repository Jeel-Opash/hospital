import { useQueryClient } from "@tanstack/react-query";

export const useInvalidatePatientData = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["patient-doctors"] });
    queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["patient-waitlist"] });
  };
};

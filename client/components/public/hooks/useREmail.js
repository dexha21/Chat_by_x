const useREmail = (email) => {
  if (!email) return false;
  const eArr = email?.split("@");
  const eACheck = eArr.length > 1 ? eArr[1] : false;
  if (!eACheck) return false;

  return eACheck.includes(".");
};

export default useREmail;
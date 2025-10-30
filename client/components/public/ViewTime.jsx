const ViewTime = ({addedDate, noTime}) => {
  const now = new Date();
  const givenDate = new Date(addedDate);
  const diff = Math.floor((now - givenDate) / 1000);
  let formattedDate = "";

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
  };

  if (diff < 60) {
    formattedDate = "Just now";
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    formattedDate = minutes === 1 ? "A minute ago" : `${minutes} minutes ago`;
  } else if (diff < 43200) {
    const hours = Math.floor(diff / 3600);
    formattedDate = hours === 1 ? "An hour ago" : `${hours} hours ago`;
  } else if (diff < 86400) {
    formattedDate = `Yesterday at ${formatTime(givenDate)}`;
  } else {
    const year = givenDate.getFullYear();
    const month = (givenDate.getMonth() + 1).toString().padStart(2, '0');
    const day = givenDate.getDate().toString().padStart(2, '0');
    formattedDate = `${year}/${month}/${day} ${!noTime ? formatTime(givenDate) : ""}`;
  }

  return formattedDate;
};

export default ViewTime;
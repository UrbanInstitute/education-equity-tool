// var url = "https://educationdata.urban.org/api/v1/schools/crdc/school-finance/2017/";
//
// console.log(url)
//
//
// function getResponse(url){
//     var request = new XMLHttpRequest();
//
//     request.open('GET', url, true);
//
//     request.onload = function() {
//         if (request.status >= 200 && request.status < 400) {
//             // Request was successful, store JSON response in a javascript object
//             var response = JSON.parse(request.responseText);
//
//             console.log(response)
//             console.log("1")
//         }
//         else {
//             // The API returned an error, handle it here
//             console.log("2")
//         }
//     };
//
//     request.onerror = function() {
//         // You were not able to connect to the API, handle the error here
//         console.log("3")
//     };
//
//     //send the request
//     request.send();
// }
//
// getResponse(url)

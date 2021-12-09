const offsetWidth = 250;
var widthChart = document.getElementById("chart").offsetWidth + offsetWidth;

let svg, g, gs, xScale, yScale;
const transitionTime = 500;

var margin = {top: 20, right: offsetWidth, bottom: 40, left: 60},
    width = widthChart - margin.left - margin.right,
    height = 550 - margin.top - margin.bottom;

const lineHeight = 20;
const circleSize = 5;
const numberLabelLeftMargin = 45;
const numberLabelRightMargin = 10;
const marginRight = 30;
// var margin, lineHeight;
// if (mobile) {
//   lineHeight = 10;
//   margin = {top: 30, right: 20, bottom: 20, left: 100};
// } else {
//   lineHeight = 12;
//   margin = {top: 60, right: 20, bottom: 80, left: 180};
// }

var raceEths = ['Black', 'Hisp', 'aian', 'asian', 'nhpi', 'twomore', 'white'];
var metrics = ['Teachers', 'Classes', 'Counselors'];
let colors = {
  'Black': "#1696D2",
  'Hisp': "#EC008B",
  'aian': "#55B748",
  'asian': "#12719E",
  'nhpi': "#CA5800",
  'twomore': "#696969",
  'white': "#FDBF11"
}

var state = {
  raceEth1: 'Black',
  raceEth2: 'white',
  metric: 'avg_exp_year_perc',
  height: null,
  sourceData: null,
  dataToPlot: null,
  name: null,
  currentState: null,
  showing: 'states',
  // districtView: null,
  myown: [],
  sortByGap: false,
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

function getUniquesMenu(df, thisVariable) {

  var thisList = df.map(function(o) {
    return o[thisVariable]
  })

  // uniq() found here https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
  function uniq(a) {
      return a.sort().filter(function(item, pos, ary) {
          return !pos || item != ary[pos - 1];
      });
  }

  var uniqueList = uniq(thisList);

  return uniqueList;
}

function addOptions(id, values, addStudents) {
  var element = d3.select("#"+id);
  var options = element.selectAll("option").data(values);

  options.enter().append("option")
    .html(function(d){
      if (addStudents) {
        return d + " students"
      } else {
        return d;
      }
    });

  options.exit().remove();

  element.selectAll("option").each(function(d, i){
    if (d === state[id]) {
      document.getElementById(id).selectedIndex = i;
    }
  });

  return element;
}

function updateOptionsCircles() {
  d3.select("#raceEth1-circle").attr("fill", colors[state.raceEth1]);
  d3.select("#raceEth2-circle").attr("fill", colors[state.raceEth2]);
}

function sortData(data) {
  let sortedData;
  if (state.sortByGap) {
    sortedData = data.sort(function(a,b){
      let gap1 = a[state.metric + "_" + state.raceEth1] - a[state.metric + "_" + state.raceEth2];
      let gap2 = b[state.metric + "_" + state.raceEth1] - b[state.metric + "_" + state.raceEth2];
      return gap1 - gap2;
    })
  } else {
    sortedData = data.sort(function(a,b){
      let name1 = a[state.name];
      let name2 = b[state.name];
      if (name1 < name2) //sort string ascending
        return -1;
      if (name1 > name2)
        return 1;
      return 0;
    })
  }
  return sortedData;
}


Promise.all([
  d3.csv('data/early_state_draft.csv'),
  d3.csv('data/early_district_draft.csv')
]).then(function(data) {
  var states = data[0];
  var districts = data[1];

  state.sourceData = states;
  state.dataToPlot = states;
  state.name = "STUSPS";

  let newRaceEthValue;
  let raceEthOp1 = addOptions("raceEth1", raceEths, false);
  raceEthOp1.on("change", function(d, i){
    newRaceEthValue = d3.select(this).node().value;
    if (newRaceEthValue !== state.raceEth2) {
      state.raceEth1 = d3.select(this).node().value;
      updateOptionsCircles();
      updateChart();
    } else {
      let idx = raceEths.indexOf(state.raceEth1);
      document.getElementById("raceEth1").selectedIndex = idx;
    }
  })

  let raceEthOp2 = addOptions("raceEth2", raceEths, false);
  raceEthOp2.on("change", function(d){
    newRaceEthValue = d3.select(this).node().value;
    if (newRaceEthValue !== state.raceEth1) {
      state.raceEth2 = d3.select(this).node().value;
      updateOptionsCircles();
      updateChart();
    } else {
      let idx = raceEths.indexOf(state.raceEth2);
      document.getElementById("raceEth2").selectedIndex = idx;
    }
  })

  updateOptionsCircles();

  let statesMenu = getUniquesMenu(states, "STUSPS", false);
  let stateOp = addOptions("state-menu", statesMenu);
  stateOp.on("change", function(d){
      newStateValue = d3.select(this).node().value;
      if (state.showing === 'districts') {
        if (state.currentState !== newStateValue) {
          state.currentState = newStateValue;
          state.myown = [];
        }
        state.sourceData = districts.filter(function(e){
          return e["STUSPS"] === state.currentState;
        });
        state.name = "leaid";
        state.showing = 'districts';
        updateSearchBox();
      }
      updateChart();
    })

  let spans = d3.select("#metrics")
    .selectAll("span")
    .data(metrics);

  spans.enter().append("span")
    .attr("class", "metric")
    .on("click", function(event, d){
      d3.selectAll(".metric")
        .classed("chosen", function(e){
          return e === d;
        })
      if (d === 'Teachers'){
        state.metric = 'avg_exp_year_perc';
      } else if (d === 'Classes'){
        state.metric = 'perc_ap_stem';
      } else if (d === 'Counselors'){
        state.metric = 'percent_adq_couns';
      }
      updateChart();
    })
    .classed("chosen", function(d){
      return d === 'Teachers';
    })
    .html(function(d){
      return d;
    })

  let districtViews = ['largest', 'myown']
  let viewSpans = d3.select("#districts-views")
    .selectAll("span")
    .data(districtViews);

  viewSpans.enter().append("span")
    .style("display", "none")
    .attr("class", "district-view")
    .on("click", function(event, d){
      d3.selectAll(".district-view")
        .classed("chosen", function(e){
          return e === d;
        })
      if (d === 'largest'){
        state.sourceData = districts.filter(function(e){
          return e["STUSPS"] === state.currentState;
        });
        state.name = "leaid";
        state.showing = 'districts';
        d3.select("#state-div").style("display", "inline-block");
        d3.select("#search").style("display", "none");
      } else {
        d3.select("#search").style("display", "block");
        state.sourceData = districts.filter(function(e){
          return ((e["STUSPS"] === state.currentState) && (state.myown.indexOf(e["leaid"]) >= 0));
        })
        state.name = "leaid";
        state.showing = 'districts';
        updateSearchBox();
      }
      updateChart();
    })
    .html(function(d){
      return d;
    })

  let toggle = d3.select("#toggle-gap").select(".slider");
  toggle.on("click", function(event, d){
    state.sortByGap = !state.sortByGap;
    updateChart();
  })

  let searchBox = d3.select("#search-box");
  let searchList = d3.select("#search-list")

  function updateSearchBox() {
    let theseDistricts = getUniquesMenu(districts.filter(function(e){
      return e['STUSPS'] === state.currentState;
    }), "leaid")

    let options = searchList.selectAll("option").data(theseDistricts);

    options.enter().append("option")
      .html(d => d);

    options.html(d => d);

    options.exit().remove();

    searchBox.attr("placeholder", "Start typing... \t" + state.myown.length + "/10")
      .on("change", function(){
        let searchLabel = d3.select(this);
        let searchedLabel = searchLabel.property("value");
        let idxLabel = theseDistricts.indexOf(searchedLabel.toLowerCase());
        let nSelected = state.myown.length;
        let isSelected = state.myown.indexOf(searchedLabel.toLowerCase()) >= 0;

        if ((idxLabel >= 0) && (nSelected < 10) && (!isSelected)) {
          state.myown.push(theseDistricts[idxLabel]);
          searchLabel.node().value = "";
          state.sourceData = districts.filter(function(e){
            return ((e["STUSPS"] === state.currentState) && (state.myown.indexOf(e["leaid"]) >= 0));
          })
          updateChart();
          d3.select(this).attr("placeholder", "Start typing... \t" + state.myown.length + "/10")
        }
      })
  }

  function moveToFront(){
    gs.selectAll(".line").moveToFront();
    gs.selectAll(".raceeth").filter(function (d,i){
      return (raceEths[i] === state.raceEth1) || (raceEths[i] === state.raceEth2)
    }).moveToFront();
    gs.selectAll(".number-label").moveToFront();
  }

  function initChart(filteredData) {

    color1 = "#1696d2"
    color2 = "#fdbf11"
    state.height = filteredData.length * lineHeight;

    svg = d3.select("#chart").append("svg")
      .attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.top + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", state.height + margin.top + margin.bottom) // + margin.top + margin.bottom);

    xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([margin.left, width])

    yScale = d3.scaleLinear()
      .domain([0, filteredData.length])
      .rangeRound([margin.top + lineHeight/2, state.height])

    var ticks = null;
    var xAxis = function(g) {
      g.attr("transform", `translate(0,${margin.top})`)
      .attr("class", "top-axis")
      .call(d3.axisTop(xScale).ticks(ticks))
      .call(g => g.selectAll(".tick line").clone()
                .attr("stroke-opacity", 0.05)
                .attr("class", "axis-line")
                .attr("y2", state.height))
      .call(g => g.selectAll(".domain").remove())
    }


    var xAxisBottom = function(g) {
      g.attr("transform", `translate(0,${state.height + margin.top})`)
      .attr("class", "bottom-axis")
      .call(d3.axisBottom(xScale).ticks(ticks))
      .call(g => g.selectAll(".domain").remove())
    }

    svg.append("g")
      .call(xAxis)

    svg.append("g")
      .call(xAxisBottom)

    g = svg.append("g");

    gs = g.selectAll("g")
      .data(filteredData)
      .join("g")
        .attr("class", "division")
        .attr("transform", function (d, i) {
          return "translate(0," + yScale(i) + ")";
        });

    gs.selectAll(".rect")
      .data(function(d){
        return [d];
      })
      .join("rect")
        .attr("class", "rect hidden")
        .attr("fill", "#f5f5f5")
        .attr("x", 0)
        .attr("y", -lineHeight/2)
        .attr("width", width)
        .attr("height", lineHeight);

    gs.selectAll(".line")
      .data(function(d){
        return [d];
      })
      .join("line")
        .attr("class", "line")
        .attr("stroke", function(d,i){
           if (d[state.metric + "_" + state.raceEth1] > d[state.metric + "_" + state.raceEth2]) {
             // return color1;
             return colors[state.raceEth1];
           } else {
             // return color2;
             return colors[state.raceEth2];
           }
        })
        .attr("stroke-width", 1.0)
        .attr("x1", d => xScale(d[state.metric + "_" + state.raceEth1]))
        .attr("x2", d => xScale(d[state.metric + "_" + state.raceEth2]));

    gs.selectAll(".raceeth")
      .data(function(d){
        return raceEths.map(function(r){
          return d[state.metric + "_" + r];
        })
      })
      .join("circle")
        .attr("class", "raceeth")
        .attr("opacity", 1.0)
        .attr("cx", function(d){
          return xScale(d)
        })
        .attr("fill", function(d,i){
          if (raceEths[i] === state.raceEth1) {
            // return color1;
            return colors[state.raceEth1];
          } else if (raceEths[i] === state.raceEth2) {
            // return color2;
            return colors[state.raceEth2];
          } else {
            return "#d2d2d2"
          }
        })
        .attr("r", circleSize);

    // Move highlighted elements to front
    moveToFront();

    gs.selectAll(".number-label")
      .data(function(d){
        let d1 = Math.min(d[state.metric + "_" + state.raceEth1], d[state.metric + "_" + state.raceEth2]);
        let d2 = Math.max(d[state.metric + "_" + state.raceEth1], d[state.metric + "_" + state.raceEth2]);
        return [d1, d2];
      })
      .join("text")
        .attr("class", "number-label hidden")
        .attr("x", function(d, i){
          if (i === 0){
            return xScale(d) - numberLabelLeftMargin;
          } else {
            return xScale(d) + numberLabelRightMargin;
          }
        })
        .style("text-anchor", function(d, i){
          if (i === 0){
            return "right";
          } else {
            return "left";
          }
        })
        .style("vertical-align", "middle")
        // .style("opacity", 0)
        .attr("y", lineHeight/4)
        .attr("fill", "black")
        .text(function(d){
          return d.toFixed(2);
        })

    gs.selectAll(".division-name")
      .data(function(d){
        return [d];
      })
      .join('text')
        .attr("class", "division-name")
        .attr("x", 0)
        .attr("y", lineHeight/4)
        .style("text-anchor", "right")
        .style("vertical-align", "middle")
        .attr('fill', 'black')
        .text(function(d){
          return d[state.name]
        })

    gs.selectAll(".show-districts")
      .data(function(d){
        return [d];
      })
      .join('text')
        .attr("class", "show-districts")
        .style("display", "none")
        .attr("x", width + marginRight)
        .attr("y", lineHeight/4)
        .style("text-anchor", "left")
        .style("vertical-align", "middle")
        .attr('fill', 'steelblue')
        .text(function(d) {
          if (state.showing === 'states') {
            return "Show me districts in State " + d[state.name];
          } else {
            return "Take me back to the state view"
          }
        })
        .on("click", function(event, d){
          if (state.showing === 'states') {
            if (state.currentState !== d["STUSPS"]) {
              state.currentState = d["STUSPS"];
              state.myown = [];
            }
            state.sourceData = districts.filter(function(e){
              return e["STUSPS"] === state.currentState;
            });
            state.name = "leaid";
            state.showing = 'districts';
            let idx = statesMenu.indexOf(state.currentState);
            document.getElementById("state-menu").selectedIndex = idx;
            d3.select("#state-div").style("display", "inline-block");
            d3.selectAll(".district-view").style("display", "inline-block")
              .classed("chosen", function(e){
                return e === 'largest';
              });
          } else {
            state.sourceData = states;
            state.name = "STUSPS";
            state.showing = 'states';
            d3.select("#state-div").style("display", "none");
            d3.selectAll(".district-view").style("display", "none");
          }
          updateChart();
        })

    svg.on("touchmove mousemove", function(event) {
      let thisX = d3.pointer(event, this)[0],
          thisY = d3.pointer(event, this)[1],
          index = Math.floor(yScale.invert(thisY + lineHeight/2));
      let gDivisions = g.selectAll(".division");
      let thisG = gDivisions.filter(function(d,i){
        return i === index;
      });
      let notThisG = gDivisions.filter(function(d,i){
        return i !== index;
      });
      if (yScale(0) - lineHeight/2 < thisY && thisY < yScale(state.dataToPlot.length) - lineHeight/2 &&
          margin.left < thisX  && thisX < width + margin.right){
        // gDivisions.classed("hidden", function(d, i){
        //   return i !== index;
        // })
        thisG.selectAll(".rect")
          .classed("hidden", false);
        notThisG.selectAll(".rect")
          .classed("hidden", true);
        thisG.selectAll(".number-label")
          .classed("hidden", false);
          // .style("opacity", 1)
        notThisG.selectAll(".number-label")
          .classed("hidden", true);
          // .style("opacity", 0);
        thisG.selectAll(".show-districts")
          .style("display", "block")
        notThisG.selectAll(".show-districts")
          .style("display", "none");
      } else {
        // gDivisions.classed("hidden", false)
        gDivisions.selectAll(".number-label")
          .classed("hidden", true)
        gDivisions.selectAll(".rect")
          .classed("hidden", true)
          // .style("opacity", 0);
        gDivisions.selectAll(".show-districts")
          .style("display", "none");
      }
    })
    .on("click", function(event){
      let thisX = d3.pointer(event, this)[0],
          thisY = d3.pointer(event, this)[1],
          index = Math.floor(yScale.invert(thisY + lineHeight/2));
      let gDivisions = g.selectAll(".division");
      let thisG = gDivisions.filter(function(d,i){
        return i === index;
      });
      // let notThisG = gDivisions.filter(function(d,i){
      //   return i !== index;
      // });
      if (yScale(0) - lineHeight/2 < thisY && thisY < yScale(state.dataToPlot.length) - lineHeight/2 &&
          margin.left < thisX  && thisX < width){
        gDivisions.classed("fixed", function(d, i){
          return i === index;
        })
        thisG.selectAll(".number-label")
          .classed("hidden", false)
          // .style("opacity", 1)
        thisG.selectAll(".rect")
          .classed("hidden", false)
          // .style("opacity", 1)
        // notThisG.selectAll(".number-label")
        //   .style("opacity", 0);
        thisG.selectAll(".show-districts")
          .style("display", "block")
        // notThisG.selectAll(".show-districts")
        //   .style("display", "none");
      }
      // else {
      //   gDivisions.classed("hidden", false)
      //   gDivisions.selectAll(".number-label")
      //     .style("opacity", 0);
      //   gDivisions.selectAll(".show-districts")
      //     .style("display", "none");
      // }
    });

  }

  function updateChart(){

    let sortedData = sortData(state.sourceData);
    if (state.showing === 'states') {
      state.dataToPlot = sortedData;
    } else {
      // add state average
      let thisState = states.filter(function(d){
        return d['STUSPS'] === state.currentState;
      })
      thisState[0].leaid = thisState[0]['STUSPS'] + ' avg';
      state.dataToPlot = [thisState[0], ...sortedData];
    }
    state.height = state.dataToPlot.length * lineHeight;

    svg.attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.top + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", state.height + margin.top + margin.bottom);

    // axes
    var gAxisTopLines = svg.selectAll(".top-axis").selectAll(".axis-line");
    gAxisTopLines.attr("y2", state.height);
    var gAxisBottom = svg.selectAll(".bottom-axis");

    gAxisBottom.attr("transform", "translate(0," + (state.height + margin.top) + ")");

    // Division groups
    var gDivisions = g.selectAll(".division").data(state.dataToPlot);

    gDivisions.enter().append("g")
      .attr("class", "division")
      .classed("state-average", function(d, i){
        return (state.showing === 'districts') && (i === 0);
      })
      .attr("transform", function (d, i) {
        return "translate(0," + yScale(i) + ")";
      });;

    gDivisions.attr("class", "division")
      .classed("state-average", function(d, i){
        return (state.showing === 'districts') && (i === 0);
      })
      .attr("transform", function (d, i) {
        return "translate(0," + yScale(i) + ")";
      });

    gDivisions.exit().remove();

    // Division rects
    let divisionRects = g.selectAll(".division").selectAll(".rect")
      .data(function(d){
        return [d];
      });

    divisionRects.enter().append("rect")
      .attr("class", "rect hidden")
      .attr("fill", "#f5f5f5")
      .attr("x", 0)
      .attr("y", -lineHeight/2)
      .attr("width", width)
      .attr("height", lineHeight);

    divisionRects
      .attr("class", "rect hidden")
      .attr("fill", "#f5f5f5")
      .attr("x", 0)
      .attr("y", -lineHeight/2)
      .attr("width", width)
      .attr("height", lineHeight);

    divisionRects.exit().remove();

    // Division names
    let divisionNames = g.selectAll(".division").selectAll(".division-name")
      .data(function(d){
        return [d];
      });

    divisionNames.enter().append("text")
      .attr("class", "division-name")
      .attr("x", 0)
      .attr("y", lineHeight/4)
      .style("text-anchor", "right")
      .style("vertical-align", "middle")
      .attr('fill', 'black')
      .text(function(d){
        return d[state.name]
      });

    divisionNames
      .attr("class", "division-name")
      .attr("x", 0)
      .attr("y", lineHeight/4)
      .style("text-anchor", "right")
      .style("vertical-align", "middle")
      .attr('fill', 'black')
      .text(function(d){
        return d[state.name]
      })

    divisionNames.exit().remove();

    // Division lines
    let divisionLines =  g.selectAll(".division").selectAll(".line")
      .data(function(d){
        return [d];
      });

    divisionLines.enter().append("line")
      .attr("class", "line")
      .attr("stroke", function(d,i){
         if (d[state.metric + "_" + state.raceEth1] > d[state.metric + "_" + state.raceEth2]) {
           // return color1;
           return colors[state.raceEth1];
         } else {
           // return color2;
           return colors[state.raceEth2];
         }
      })
      .attr("stroke-width", 1.0)
      .attr("x1", d => xScale(d[state.metric + "_" + state.raceEth1]))
      .attr("x2", d => xScale(d[state.metric + "_" + state.raceEth2]));

    divisionLines.transition().duration(transitionTime)
      .attr("stroke", function(d,i){
         if (d[state.metric + "_" + state.raceEth1] > d[state.metric + "_" + state.raceEth2]) {
           // return color1;
           return colors[state.raceEth1];
         } else {
           // return color2;
           return colors[state.raceEth2];
         }
      })
      .attr("x1", d => xScale(d[state.metric + "_" + state.raceEth1]))
      .attr("x2", d => xScale(d[state.metric + "_" + state.raceEth2]));

    let divisionCircles = g.selectAll(".division").selectAll(".raceeth")
      .data(function(d){
        return raceEths.map(function(r){
          return d[state.metric + "_" + r];
        })
      });

    divisionCircles.enter().append("circle")
        .transition().duration(transitionTime)
        .attr("class", "raceeth")
        .attr("opacity", 1.0)
        .attr("cx", function(d){
          return xScale(d)
        })
        .attr("fill", function(d,i){
          if (raceEths[i] === state.raceEth1) {
            // return color1;
            return colors[state.raceEth1];
          } else if (raceEths[i] === state.raceEth2) {
            // return color2;
            return colors[state.raceEth2];
          } else {
            return "#d2d2d2"
          }
        })
        .attr("r", circleSize)

    divisionCircles
      .transition().duration(transitionTime)
      .attr("cx", function(d){
        return xScale(d)
      })
      .attr("fill", function(d,i){
        if (raceEths[i] === state.raceEth1) {
          // return color1;
          return colors[state.raceEth1];
        } else if (raceEths[i] === state.raceEth2) {
          // return color2;
          return colors[state.raceEth2];
        } else {
          return "#d2d2d2"
        }
      });

    divisionCircles.exit().remove();

    moveToFront();

    // Division numer labels
    let divisionNumberLabels = g.selectAll(".division").selectAll(".number-label")
      .data(function(d){
        let d1 = Math.min(d[state.metric + "_" + state.raceEth1], d[state.metric + "_" + state.raceEth2]);
        let d2 = Math.max(d[state.metric + "_" + state.raceEth1], d[state.metric + "_" + state.raceEth2]);
        return [d1, d2];
      })

    divisionNumberLabels.enter().append("text")
        .attr("class", "number-label")
        .classed("hidden", true)
        .attr("x", function(d, i){
          if (i === 0){
            return xScale(d) - numberLabelLeftMargin;
          } else {
            return xScale(d) + numberLabelRightMargin;
          }
        })
        .style("text-anchor", function(d, i){
          if (i === 0){
            return "right";
          } else {
            return "left";
          }
        })
        .style("vertical-align", "middle")
        // .style("opacity", 0)
        .attr("y", lineHeight/4)
        .attr("fill", "black")
        .text(function(d){
          return d.toFixed(2);
        })

    divisionNumberLabels
        .attr("class", "number-label")
        .classed("hidden", true)
        .attr("x", function(d, i){
          if (i === 0){
            return xScale(d) - numberLabelLeftMargin;
          } else {
            return xScale(d) + numberLabelRightMargin;
          }
        })
        .style("text-anchor", function(d, i){
          if (i === 0){
            return "right";
          } else {
            return "left";
          }
        })
        .style("vertical-align", "middle")
        // .style("opacity", 0)
        .attr("y", lineHeight/4)
        .attr("fill", "black")
        .text(function(d){
          return d.toFixed(2);
        })

    divisionNumberLabels.exit().remove();

    // Division change division
    let divisionChange = g.selectAll(".division").selectAll(".show-districts")
      .data(function(d){
        return [d];
      })

    divisionChange.enter().append("text")
      .attr("class", "show-districts")
      .style("display", "none")
      .attr("x", width + marginRight)
      .attr("y", lineHeight/4)
      .style("text-anchor", "left")
      .style("vertical-align", "middle")
      .attr('fill', 'steelblue')
      .text(function(d) {
        if (state.showing === 'states') {
          return "Show me districts in State " + d[state.name];
        } else {
          return "Take me back to the state view"
        }
      })
      .on("click", function(event, d){
        if (state.showing === 'states') {
          if (state.currentState !== d["STUSPS"]) {
            state.currentState = d["STUSPS"];
            state.myown = [];
          }
          state.sourceData = districts.filter(function(e){
            return e["STUSPS"] === state.currentState;
          });
          state.name = "leaid";
          state.showing = 'districts';
          let idx = statesMenu.indexOf(state.currentState);
          document.getElementById("state-menu").selectedIndex = idx;
          d3.select("#state-div").style("display", "inline-block");
          d3.selectAll(".district-view").style("display", "inline-block")
            .classed("chosen", function(e){
              return e === 'largest';
            });
        } else {
          state.sourceData = states;
          state.name = "STUSPS";
          state.showing = 'states';
          d3.select("#state-div").style("display", "none");
          d3.selectAll(".district-view").style("display", "none");
          d3.select("#search").style("display", "none");
        }
        updateChart();
      })

    divisionChange
      .attr("class", "show-districts")
      .style("display", "none")
      .attr("x", width + marginRight)
      .attr("y", lineHeight/4)
      .style("text-anchor", "left")
      .style("vertical-align", "middle")
      .attr('fill', 'steelblue')
      .text(function(d) {
        if (state.showing === 'states') {
          return "Show me districts in State " + d[state.name];
        } else {
          return "Take me back to the state view"
        }
      })
      .on("click", function(event, d){
        if (state.showing === 'states') {
          if (state.currentState !== d["STUSPS"]) {
            state.currentState = d["STUSPS"];
            state.myown = [];
          }
          state.sourceData = districts.filter(function(e){
            return e["STUSPS"] === state.currentState;
          });
          state.name = "leaid";
          state.showing = 'districts';
          let idx = statesMenu.indexOf(state.currentState);
          document.getElementById("state-menu").selectedIndex = idx;
          d3.select("#state-div").style("display", "inline-block");
          d3.selectAll(".district-view").style("display", "inline-block")
            .classed("chosen", function(e){
              return e === 'largest';
            });
        } else {
          state.sourceData = states;
          state.name = "STUSPS";
          state.showing = 'states';
          d3.select("#state-div").style("display", "none");
          d3.selectAll(".district-view").style("display", "none");
          d3.select("#search").style("display", "none");
        }
        updateChart();
      })

    divisionChange.exit().remove();
  }

  initChart(state.dataToPlot);

  // drawChart(states, districts)
  //
  // $("#menuState").autocomplete({
  //   source: statesMenu,
  //   select: function(event, ui) {
  //     var selectedState  = ui.item.value;
  //     highlightStates(selectedState)
  //   }
  // });
})

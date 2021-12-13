const offsetWidth = 250;
var widthChart = document.getElementById("chart").offsetWidth + offsetWidth;

let svg, g, gs, xScale, yScale, tickValues;
const transitionTime = 500;

var margin = {top: 20, right: offsetWidth, bottom: 40, left: 100},
    width = widthChart - margin.left - margin.right,
    height = 550 - margin.top - margin.bottom;

const lineHeight = 20;
const circleSize = 5;
const numberLabelLeftMargin = 25;
const numberLabelRightMargin = 10;
const marginRight = 40;
// var margin, lineHeight;
// if (mobile) {
//   lineHeight = 10;
//   margin = {top: 30, right: 20, bottom: 20, left: 100};
// } else {
//   lineHeight = 12;
//   margin = {top: 60, right: 20, bottom: 80, left: 180};
// }

let raceEthsLabels = ['AIAN students', 'Asian students', 'Black students',
    'Hispanic students', 'NHPI students', 'Two or more', 'White students'];
let raceEths = {
  'Black students': 'Black',
  'Hispanic students': 'Hisp',
  'AIAN students': 'aian',
  'Asian students': 'asian',
  'NHPI students': 'nhpi',
  'Two or more': 'twomore',
  'White students': 'white'
}
let metrics = ['Teachers', 'Classes', 'Counselors'];
let metricCols = {
  'Teachers': 'avg_exp_year_perc',
  'Classes': 'perc_ap_stem',
  'Counselors': 'percent_adq_couns'
}
let colors = {
  'Black students': "#1696D2",
  'Hispanic students': "#EC008B",
  'AIAN students': "#55B748",
  'Asian students': "#12719E",
  'NHPI students': "#CA5800",
  'Two or more': "#696969",
  'White students': "#FDBF11"
}

var state = {
  raceEth1: 'Black students',
  raceEth2: 'White students',
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
  expandScale: false,
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

function updateMetricText() {
  let metricText = d3.select("#metrics-text");
  let tooltip = '<div class="help-tip"><p>When sorting by gap, the tool organizes states by the difference in shares between the first racial or ethnic group selected and the second racial or ethnic group selected. As such, states where the first group has a higher share of the selected measure will be displayed toward the top, and states where the second group has a higher share of the selected measure will be displayed toward the bottom.</p></div>'
  if (state.metric === 'avg_exp_year_perc'){
    metricText.html('Research has shown that experienced teachers are more effective than inexperienced teachers, and <a href="https://edtrust.org/resource/5-things-to-advance-equity-in-access-to-strong-and-diverse-educators/" target="_blank">addressing these inequities</a> can improve reading and math test scores. Below, we display the share of teachers who have more than two years of experience.' + tooltip)
  } else if (state.metric === 'perc_ap_stem'){
    metricText.html('By engaging with advanced coursework, students are more likely to graduate from high school and get a head start on postsecondary education. But students of color, including Black and Latino students, continue to <a href="https://edtrust.org/resource/inequities-in-advanced-coursework/" target="_blank">lack access to advanced classes</a>. Below, we display the share of high school students who have access to both an AP math class and an AP science class.' + tooltip)
  } else if (state.metric === 'percent_adq_couns'){
    metricText.html('School counselors can have an <a href="http://exclusive.multibriefs.com/content/beyond-teachers-estimating-individual-school-counselors-effects-on-educatio/education" target="_blank">outsized impact on a student’s life</a>, leading to increased high school graduation and college enrollment and completion. Below, we display the share of high school students who have access to adequate school counselors, defined as schools with at least <a href="https://www.schoolcounselor.org/Standards-Positions/Position-Statements/ASCA-Position-Statements/The-Professional-Counselor-and-Use-of-Support-Staf" target="_blank">one counselor for every 250 students</a>.' + tooltip)
  }
}

function sortData(data) {
  let sortedData;
  if (state.sortByGap) {
    sortedData = data.sort(function(a,b) {
      let gap1 = a[state.metric + "_" + raceEths[state.raceEth1]] - a[state.metric + "_" + raceEths[state.raceEth2]];
      let gap2 = b[state.metric + "_" + raceEths[state.raceEth1]] - b[state.metric + "_" + raceEths[state.raceEth2]];
      if(!isFinite(gap1) && !isFinite(gap2)) {
        return 0;
      }
      if(!isFinite(gap1)) {
        return 1;
      }
      if(!isFinite(gap2)) {
        return -1;
      }
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

function zoomInScale() {
  let allExtents = raceEthsLabels.map(function(r){
    return d3.extent(state.dataToPlot, function(d){
      return d[state.metric + "_" + raceEths[r]];
    })
  });
  let extent = d3.extent(allExtents, function(d){
    return d[0];
  });
  let minValue = (Math.floor(extent[0] / 10) * 10);
  xScale.domain([minValue, 100])
    .range([margin.left, width]);
  if (minValue > 50) {
    tickValues = d3.range(minValue, 100.01, 5);
  } else {
    tickValues = d3.range(minValue, 100.01, 10);
  }
}

function zoomOutScale() {
  xScale.domain([0, 100])
    .range([margin.left, width]);
  tickValues = d3.range(0, 100.01, 10);
}

function showDistrictDivs() {
  d3.select("#state-div").style("display", "inline-block");
  d3.select("#districts-text").style("display", "block");
}

function hideDistrictDivs() {
  d3.select("#state-div").style("display", "none");
  d3.select("#districts-text").style("display", "none");
  d3.selectAll(".district-view").style("display", "none");
}


Promise.all([
  d3.csv('data/early_state_draft.csv'),
  d3.csv('data/early_district_draft.csv')
]).then(function(data) {
  var states = data[0];
  var districts = data[1];

  let convertStringToNumbers = function(array){
    array.forEach(function(d){
      for (let m = 0; m < metrics.length; m++ ) {
        for (let r = 0; r < raceEthsLabels.length; r++ ) {
          let col = metricCols[metrics[m]] + "_" + raceEths[raceEthsLabels[r]];
          d[col] = +d[col] * 100;
        }
      }
    })
  }

  convertStringToNumbers(states);
  convertStringToNumbers(districts);

  state.sourceData = states;
  state.dataToPlot = states;
  state.name = "STUSPS";

  let newRaceEthValue;
  let raceEthOp1 = addOptions("raceEth1", raceEthsLabels);
  raceEthOp1.on("change", function(d, i){
    newRaceEthValue = d3.select(this).node().value;
    if (newRaceEthValue !== state.raceEth2) {
      state.raceEth1 = d3.select(this).node().value;
      updateOptionsCircles();
      updateChart();
    } else {
      let idx = raceEthsLabels.indexOf(state.raceEth1);
      document.getElementById("raceEth1").selectedIndex = idx;
    }
  })

  let raceEthOp2 = addOptions("raceEth2", raceEthsLabels);
  raceEthOp2.on("change", function(d){
    newRaceEthValue = d3.select(this).node().value;
    if (newRaceEthValue !== state.raceEth1) {
      state.raceEth2 = d3.select(this).node().value;
      updateOptionsCircles();
      updateChart();
    } else {
      let idx = raceEthsLabels.indexOf(state.raceEth2);
      document.getElementById("raceEth2").selectedIndex = idx;
    }
  })

  updateOptionsCircles();

  let statesMenu = getUniquesMenu(states, "STUSPS");
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
      state.metric = metricCols[d]
      if (d === 'Teachers'){
        d3.select("#toggle-scale").style("display", "inline-block");
      } else if (d === 'Classes'){
        d3.select("#toggle-scale").style("display", "none");
      } else if (d === 'Counselors'){
        d3.select("#toggle-scale").style("display", "none");
      }
      updateMetricText();
      updateChart();
    })
    .classed("chosen", function(d){
      return d === 'Teachers';
    })
    .html(function(d){
      return d;
    })

  updateMetricText();

  let districtViews = ['Largest districts', 'Build my own']
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
      if (d === 'Largest districts'){
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

  let toggleGap = d3.select("#toggle-gap").select(".slider");
  toggleGap.on("click", function(event, d){
    state.sortByGap = !state.sortByGap;
    updateChart();
  })

  let toggleScale = d3.select("#toggle-scale").select(".slider");
  toggleScale.on("click", function(event, d){
    if (state.metric == 'avg_exp_year_perc') {
      state.expandScale = !state.expandScale;
    }
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
      .html(function(d) {
        return d
      });

    options.html(function(d) {
      return d
    });

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
      return (raceEthsLabels[i] === state.raceEth1) || (raceEthsLabels[i] === state.raceEth2)
    }).moveToFront();
    gs.selectAll(".number-label").moveToFront();
  }

  let getLineStroke = function(d, i) {
    console.log(state.metric, raceEths[state.raceEth1], raceEths[state.raceEth2])
    if ((!isNaN(d[state.metric + "_" + raceEths[state.raceEth1]])) && (!isNaN(d[state.metric + "_" + raceEths[state.raceEth2]]))) {
      if (d[state.metric + "_" + raceEths[state.raceEth1]] > d[state.metric + "_" + raceEths[state.raceEth2]]) {
        // return color1;
        return colors[state.raceEth1];
      } else {
        // return color2;
        return colors[state.raceEth2];
      }
    } else {
      return "none";
    }
  }

  let getCircleFill = function(d, i) {
    if (!isNaN(d)) {
      if (raceEthsLabels[i] === state.raceEth1) {
        // return color1;
        return colors[state.raceEth1];
      } else if (raceEthsLabels[i] === state.raceEth2) {
        // return color2;
        return colors[state.raceEth2];
      } else {
        return "#d2d2d2"
      }
    } else {
      return "none";
    }
  }

  let getNumberLabelPos = function(d, i) {
    if (i === 0){
      if (d === 100) {
        return xScale(d) - numberLabelLeftMargin - 10;
      } else if (d < 10) {
        return xScale(d) - numberLabelLeftMargin + 5;
      } else {
        return xScale(d) - numberLabelLeftMargin;
      }
    } else {
      return xScale(d) + numberLabelRightMargin;
    }
  }

  let getNumberLabelFill = function(d, i) {
    if (isNaN(d)) {
      return "none"
    } else {
      return "black";
    }
  }

  let formatPercent = function(d) {
    return d + "%";
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
      .domain([0, 100])
      .range([margin.left, width])

    yScale = d3.scaleLinear()
      .domain([0, filteredData.length])
      .rangeRound([margin.top + lineHeight/2, state.height])

    var xAxis = function(g) {
      g.attr("transform", `translate(0,${margin.top})`)
      .attr("class", "top-axis")
      .call(d3.axisTop(xScale).tickValues(tickValues).tickFormat(formatPercent))
      .call(g => g.selectAll(".tick line").clone()
                .attr("stroke-opacity", 0.05)
                .attr("class", "axis-line")
                .attr("y2", state.height))
      .call(g => g.selectAll(".domain").remove())
    }

    var xAxisBottom = function(g) {
      g.attr("transform", `translate(0,${state.height + margin.top})`)
      .attr("class", "bottom-axis")
      .call(d3.axisBottom(xScale).tickValues(tickValues).tickFormat(formatPercent))
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
        .attr("stroke", getLineStroke)
        .attr("stroke-width", 1.0)
        .attr("x1", function(d) {
          return xScale(d[state.metric + "_" + raceEths[state.raceEth1]])
        })
        .attr("x2", function(d) {
          return xScale(d[state.metric + "_" + raceEths[state.raceEth2]])
        });

    gs.selectAll(".raceeth")
      .data(function(d){
        return raceEthsLabels.map(function(r){
          return d[state.metric + "_" + raceEths[r]];
        })
      })
      .join("circle")
        .attr("class", "raceeth")
        .attr("opacity", 1.0)
        .attr("cx", function(d){
          return xScale(d);
        })
        .attr("fill", getCircleFill)
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
        .attr("x", getNumberLabelPos)
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
        .attr("fill", getNumberLabelFill)
        .text(function(d){
          return d.toFixed(0);
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
            return "Show me districts in " + d[state.name];
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
            showDistrictDivs();
            d3.selectAll(".district-view").style("display", "inline-block")
              .classed("chosen", function(e){
                return e === 'Largest districts';
              });
          } else {
            state.sourceData = states;
            state.name = "STUSPS";
            state.showing = 'states';
            showDistrictDivs();
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
          .classed("hidden", state.showing !== 'districts');
          // .style("opacity", 0);
        thisG.selectAll(".show-districts")
          .style("display", "block")
        notThisG.selectAll(".show-districts")
          .style("display", "none");
      } else {
        // gDivisions.classed("hidden", false)
        gDivisions.selectAll(".number-label")
          .classed("hidden", state.showing !== 'districts')
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

    // Update scales
    if (state.metric === 'avg_exp_year_perc'){
      if (state.expandScale) {
        zoomInScale();
      } else {
        zoomOutScale();
      }
    } else {
      zoomOutScale();
    }

    // axes
    svg.selectAll(".axis-line").remove();

    var gAxisTop = svg.selectAll(".top-axis");

    gAxisTop.call(d3.axisTop(xScale).tickValues(tickValues).tickFormat(formatPercent))
      .call(g => g.selectAll(".tick line").clone()
                .attr("stroke-opacity", 0.05)
                .attr("class", "axis-line")
                .attr("y2", state.height))
      .call(g => g.selectAll(".domain").remove());

    var gAxisBottom = svg.selectAll(".bottom-axis");

    gAxisBottom.attr("transform", "translate(0," + (state.height + margin.top) + ")")
      .call(d3.axisBottom(xScale).tickValues(tickValues).tickFormat(formatPercent))
      .call(g => g.selectAll(".domain").remove());

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
      .transition().duration(transitionTime)
      .attr("class", "line")
      .attr("stroke", getLineStroke)
      .attr("stroke-width", 1.0)
      .attr("x1", function(d) {
        return xScale(d[state.metric + "_" + raceEths[state.raceEth1]])
      })
      .attr("x2", function(d) {
        return xScale(d[state.metric + "_" + raceEths[state.raceEth2]])
      });

    divisionLines.transition().duration(transitionTime)
      .attr("stroke", getLineStroke)
      .attr("x1", function(d) {
        return xScale(d[state.metric + "_" + raceEths[state.raceEth1]])
      })
      .attr("x2", function(d) {
        return xScale(d[state.metric + "_" + raceEths[state.raceEth2]])
      });

    let divisionCircles = g.selectAll(".division").selectAll(".raceeth")
      .data(function(d){
        return raceEthsLabels.map(function(r){
          return d[state.metric + "_" + raceEths[r]];
        })
      });

    divisionCircles.enter().append("circle")
        .transition().duration(transitionTime)
        .attr("class", "raceeth")
        .attr("opacity", 1.0)
        .attr("cx", function(d){
          return xScale(d);
        })
        .attr("fill", getCircleFill)
        .attr("r", circleSize)

    divisionCircles
      .transition().duration(transitionTime)
      .attr("cx", function(d){
        return xScale(d);
      })
      .attr("fill", getCircleFill);

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
        .classed("hidden", state.showing !== 'districts')
        .attr("x", getNumberLabelPos)
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
        .attr("fill", getNumberLabelFill)
        .text(function(d){
          return d.toFixed(0);
        })

    divisionNumberLabels
        .attr("class", "number-label")
        .classed("hidden", state.showing !== 'districts')
        .attr("x", getNumberLabelPos)
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
        .attr("fill", getNumberLabelFill)
        .text(function(d){
          return d.toFixed(0);
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
          return "Show me districts in " + d[state.name];
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
          showDistrictDivs();
          d3.selectAll(".district-view").style("display", "inline-block")
            .classed("chosen", function(e){
              return e === 'Largest districts';
            });
        } else {
          state.sourceData = states;
          state.name = "STUSPS";
          state.showing = 'states';
          hideDistrictDivs();
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
          return "Show me districts in " + d[state.name];
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
          showDistrictDivs();
          d3.selectAll(".district-view").style("display", "inline-block")
            .classed("chosen", function(e){
              return e === 'Largest districts';
            });
        } else {
          state.sourceData = states;
          state.name = "STUSPS";
          state.showing = 'states';
          hideDistrictDivs();
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

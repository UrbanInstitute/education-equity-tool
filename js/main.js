const offsetWidth = 250;
var widthChart = document.getElementById("chart").offsetWidth + offsetWidth;
console.log(widthChart)

let svg, g, gs, xScale, yScale, tickValues;
let dataTooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("left", 0)
    .style("top", 0)
    .style("display", "none")
    .html("<p>In states or districts where fewer than 50 students belong to a certain racial or ethnic group, the group is not displayed.</p>");

let stateTooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("left", 0)
    .style("top", 0)
    .style("display", "none")
    .html("<p>Because this state has only one traditional public school district, we do not include district-specific breakdowns.</p>");

const transitionTime = 500;

var margin = {top: 20, right: offsetWidth, bottom: 20, left: 100},
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
  'Black students': 'black',
  'Hispanic students': 'hispanic',
  'AIAN students': 'aian',
  'Asian students': 'asian',
  'NHPI students': 'nhpi',
  'Two or more': 'twomore',
  'White students': 'white'
};
let metrics = ['Teachers', 'Classes', 'Counselors'];
let metricCols = {
  'Teachers': 'avg_exp_year_perc',
  'Classes': 'perc_ap_stem',
  'Counselors': 'percent_adq_couns'
};
let colors = {
  'Black students': "#1696D2",
  'Hispanic students': "#EC008B",
  'AIAN students': "#55B748",
  'Asian students': "#12719E",
  'NHPI students': "#CA5800",
  'Two or more': "#696969",
  'White students': "#FDBF11"
};
let twoColors = ["#1696D2", "#FDBF11"];

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
  districtView: 'Largest districts',
  stateFixed: null,
  districtFixed: null,
  myown: [],
  sortByGap: true,
  expandScale: false,
}

let districtExplanation = '<p>Use the tabs below to explore the largest 10 districts in the selected state by number of students enrolled or to create your own comparison by adding up to 10 districts in the selected state.</p>';
let stateExplanation = '<p>When sorting by gap, the tool organizes states by the difference in shares between the first racial or ethnic group selected and the second racial or ethnic group selected. As such, states where the first group has a higher share of the selected measure will be displayed toward the top, and states where the second group has a higher share of the selected measure will be displayed toward the bottom.</p>'
let plusIcon = '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23 0H26V48H23V0Z" fill="black"/><path d="M48 23V26L0 26L1.31135e-07 23L48 23Z" fill="black"/></svg>';

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

  options.enter().append("a")
    .html(function(d){
      if (addStudents) {
        return d + " students"
      } else {
        return d;
      }
    });

  options.exit().remove();

  return element;
}

function updateOptionsCircles() {
  // d3.select("#raceEth1-circle").attr("fill", colors[state.raceEth1]);
  // d3.select("#raceEth2-circle").attr("fill", colors[state.raceEth2]);
  d3.select("#raceEth1-circle").attr("fill", twoColors[0]);
  d3.select("#raceEth2-circle").attr("fill", twoColors[1]);
}

function updateMetricText() {
  let metricText = d3.select("#metrics-text");
  if (state.metric === 'avg_exp_year_perc'){
    metricText.html('Research has shown that experienced teachers are more effective than inexperienced teachers, and <a href="https://edtrust.org/resource/5-things-to-advance-equity-in-access-to-strong-and-diverse-educators/" target="_blank">addressing these inequities</a> can improve reading and math test scores. Below, we display the share of teachers who have more than two years of experience.</p>')
  } else if (state.metric === 'perc_ap_stem'){
    metricText.html('By engaging with advanced coursework, students are more likely to graduate from high school and get a head start on postsecondary education. But students of color, including Black and Latino students, continue to <a href="https://edtrust.org/resource/inequities-in-advanced-coursework/" target="_blank">lack access to advanced classes</a>. Below, we display the share of high school students who have access to both an AP math class and an AP science class.</p>')
  } else if (state.metric === 'percent_adq_couns'){
    metricText.html('School counselors can have an <a href="http://exclusive.multibriefs.com/content/beyond-teachers-estimating-individual-school-counselors-effects-on-educatio/education" target="_blank">outsized impact on a student’s life</a>, leading to increased high school graduation and college enrollment and completion. Below, we display the share of high school students who have access to adequate school counselors, defined as schools with at least <a href="https://www.schoolcounselor.org/Standards-Positions/Position-Statements/ASCA-Position-Statements/The-Professional-Counselor-and-Use-of-Support-Staf" target="_blank">one counselor for every 250 students</a>.</p>')
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
      return gap2 - gap1;
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
    .range([margin.left, width + margin.left]);
  if (minValue > 50) {
    tickValues = d3.range(minValue, 100.01, 5);
  } else {
    tickValues = d3.range(minValue, 100.01, 10);
  }
}

function zoomOutScale() {
  xScale.domain([0, 100])
    .range([margin.left, width + margin.left]);
  tickValues = d3.range(0, 100.01, 10);
}

function showDistrictDivs() {
  d3.select("#state-div").style("display", "inline-block");
  d3.select("#explanation-text").html(districtExplanation);
}

function hideDistrictDivs() {
  d3.select("#state-div").style("display", "none");
  d3.select("#explanation-text").html(stateExplanation);
  d3.selectAll(".district-view").style("display", "none");
}

Promise.all([
  d3.csv('data/state_final.csv'),
  d3.csv('data/district_final.csv')
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
  state.name = "NAME";

  function getCircleHtml(color) {
    return '<svg width="14px" height="14px"><circle id="raceEth1-circle" cx="7px" cy="7px" r="7px" fill="' + color + '"></circle></svg>'
  }

  // Close the dropdown menu if the user clicks outside of it
  window.onclick = function(event) {
    if (!event.target.matches('#dropbtn1')) {
      var dropdown = document.getElementById("raceEth1");
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      }
    }
    if (!event.target.matches('#dropbtn2')) {
      var dropdown = document.getElementById("raceEth2");
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      }
    }
    if (!event.target.matches('#search-box')) {
      var dropdown = document.getElementById("search-list");
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        d3.select("#search-box").html("Start typing...");
      }
    }
  }

  function greyOutRaceEth(){
    d3.select("#raceEth1").selectAll("a")
      .classed("not-available", function(d){
        return d === state.raceEth2;
      })

    d3.select("#raceEth2").selectAll("a")
      .classed("not-available", function(d){
        return d === state.raceEth1;
      })
  }

  let raceEthOp1 = addOptions("raceEth1", raceEthsLabels);
  d3.select("#dropdown1")
    .on("click", function(d){
      document.getElementById("raceEth1").classList.toggle("show");
    });
  d3.select("#dropdown1").select(".dropbtn").html(getCircleHtml(twoColors[0]) + state.raceEth1);
  raceEthOp1.selectAll("a").on("click", function(event, d){
    if (d !== state.raceEth2) {
      state.raceEth1 = d;
      d3.select("#dropdown1").select(".dropbtn").html(getCircleHtml(twoColors[0]) + state.raceEth1);
      greyOutRaceEth();
      updateOptionsCircles();
      updateChart();
    }
  })

  let raceEthOp2 = addOptions("raceEth2", raceEthsLabels);
  d3.select("#dropdown2")
    .on("click", function(d){
      document.getElementById("raceEth2").classList.toggle("show");
    });
  d3.select("#dropdown2").select(".dropbtn").html(getCircleHtml(twoColors[1]) + state.raceEth2);
  raceEthOp2.selectAll("a").on("click", function(event, d){
    if (d !== state.raceEth1) {
      state.raceEth2 = d;
      d3.select("#dropdown2").select(".dropbtn").html(getCircleHtml(twoColors[1]) + state.raceEth2);
      greyOutRaceEth();
      updateOptionsCircles();
      updateChart();
    }
  })

  greyOutRaceEth();

  updateOptionsCircles();

  let statesMenu = getUniquesMenu(states, "NAME");
  d3.select("#dropdown3")
    .on("click", function(d){
      document.getElementById("state-menu").classList.toggle("show");
    });
  let stateOp = addOptions("state-menu", statesMenu);
  stateOp.selectAll("a").on("click", function(event, d){
      if (state.showing === 'districts') {
        if (state.currentState !== d) {
          state.currentState = d;
          state.myown = [];
        }
        state.sourceData = districts.filter(function(e){
          return e["NAME"] === state.currentState;
        });
        state.name = "lea_name";
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
          return e["NAME"] === state.currentState;
        });
        state.name = "lea_name";
        state.showing = 'districts';
        state.districtViews = 'largest';
        d3.select("#state-div").style("display", "inline-block");
        d3.select("#search").style("display", "none");
        d3.select("#selected-districts").style("display", "none");
      } else {
        d3.select("#search").style("display", "block");
        d3.select("#selected-districts").style("display", "block");
        state.sourceData = districts.filter(function(e){
          return ((e["NAME"] === state.currentState) && (state.myown.indexOf(e["lea_name"]) >= 0));
        })
        state.name = "lea_name";
        state.showing = 'districts';
        state.districtView = 'myown';
        updateSearchBox();
      }
      updateChart();
    })
    .html(function(d){
      return d;
    })

  d3.select("#explanation-text").html(stateExplanation);

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
  let searchList = d3.select("#search-list");
  let districtsList = d3.select("#selected-districts");

  function updateDistricts() {
    state.sourceData = districts.filter(function(e){
      return ((e["NAME"] === state.currentState) && (state.myown.indexOf(e["lea_name"]) >= 0));
    })
  }


  function updateSearchBox() {
    let theseDistricts = getUniquesMenu(districts.filter(function(e){
      return e['NAME'] === state.currentState;
    }), "lea_name")

    function updateSearchList(thisData){
      let options = searchList.selectAll("a").data(thisData);

      options.enter().append("a")
        .html(function(d) {
          return d
        });

      options.html(function(d) {
        return d
      });

      options.exit().remove();

      searchList.selectAll("a").on("click", function(event, d){
        let idxLabel = theseDistricts.indexOf(d);
        let nSelected = state.myown.length;
        let isSelected = state.myown.indexOf(d) >= 0;

        if ((idxLabel >= 0) && (nSelected < 10) && (!isSelected)) {
          state.myown.push(theseDistricts[idxLabel]);
          searchBox.html("Start typing...");
          updateSearchList(theseDistricts);
          updateDistricts();
          updateDistrictsList();
          updateChart();
          d3.select("#number-selected").html(state.myown.length + "/10" + plusIcon);
        }
      })
    }

    updateSearchList(theseDistricts);

    d3.select("#number-selected").html(state.myown.length + "/10" + plusIcon);

    searchBox.on("click",function(){
        d3.select(this).html("");
        document.getElementById("search-list").classList.toggle("show");
        updateSearchList(theseDistricts);
      })
      .on("keyup", function(event, d){
        let entered =  d3.select(this).text().toLowerCase();
        let thisData = theseDistricts.filter(function(d){
          return d.toLowerCase().includes(entered);
        })
        updateSearchList(thisData);
      })
  }

  function updateDistrictsList() {

    let selectedDistricts = districtsList.selectAll(".selected-district").data(state.sourceData);

    selectedDistricts.enter().append("div")
      .attr("class", "selected-district")
      .html(function(d){
        return d[state.name];
      })

    selectedDistricts.html(function(d){
      return d[state.name];
    })

    selectedDistricts.exit().remove();

    let spanClick = function(event, d) {
      state.myown = state.myown.filter(function(m){
        return m !== d.lea_name;
      });
      d3.select("#number-selected").html(state.myown.length + "/10" + plusIcon);
      updateDistricts();
      updateDistrictsList();
      updateChart();
    }

    let spans = districtsList.selectAll(".selected-district").selectAll("span")
      .data(function(d){
        return [d];
      });

    spans.enter().append("span")
      .on("click", spanClick)
      .html(function(d){
        return 'Remove';
      })

    spans.on("click", spanClick)
    .html(function(d){
      return 'Remove';
    })

    spans.exit().remove();

  }

  function moveToFront(){
    gs.selectAll(".line").moveToFront();
    gs.selectAll(".raceeth").filter(function (d,i){
      return ((d.raceEth === state.raceEth1) | (d.raceEth === state.raceEth2));
    }).moveToFront();
    gs.selectAll(".number-label").moveToFront();
  }

  let getLineStroke = function(d, i) {
    if ((!isNaN(d[state.metric + "_" + raceEths[state.raceEth1]])) && (!isNaN(d[state.metric + "_" + raceEths[state.raceEth2]]))) {
      if (d[state.metric + "_" + raceEths[state.raceEth1]] > d[state.metric + "_" + raceEths[state.raceEth2]]) {
        return twoColors[0]
        // return colors[state.raceEth1];
      } else {
        return twoColors[1];
        // return colors[state.raceEth2]
      }
    } else {
      return "none";
    }
  }

  let getCircleFill = function(d, i) {
    if (!isNaN(d.value)) {
      if (d.raceEth === state.raceEth1) {
        return twoColors[0];
        // return colors[state.raceEth1];
      } else if (d.raceEth === state.raceEth2) {
        return twoColors[1];
        // return colors[state.raceEth2];
      } else {
        return "#ECECEC"
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

  function processData() {
    if (state.showing === 'states') {
      state.dataToPlot = sortData(state.sourceData);
    } else {
      let sortedData;
      if (state.districtView === 'largets'){
        sortedData = sortData(state.sourceData.filter(n => n.top10_flag === '1'));
      } else {
        sortedData = sortData(state.sourceData);
      }
      // add state average
      let thisState = states.filter(function(d){
        return d['NAME'] === state.currentState;
      })
      thisState[0].lea_name = thisState[0]['NAME'] + ' avg';
      state.dataToPlot = [thisState[0], ...sortedData];
    }
  }

  function highlightFixed() {
    let gDivisions = g.selectAll(".division");

    function showHighlighted(reference, id){
      if (reference === null) {
        gDivisions.classed("fixed", false);
      } else {
        let thisGroup = gDivisions.filter(function(d,i){
          return d[id] === reference;
        });
        gDivisions.classed("fixed", function(d, i){
          return d[id] === reference;
        })
        thisGroup.selectAll(".number-label")
          .classed("hidden", false);
        thisGroup.selectAll(".rect")
          .classed("hidden", false);
        thisGroup.selectAll(".show-districts")
          .style("display", "block");
      }
    }

    if (state.showing === 'states') {
      showHighlighted(state.stateFixed, 'NAME');
    } else {
      showHighlighted(state.districtFixed, 'lea_name');
    }

  }

  function initChart(filteredData) {

    processData();

    state.height = state.dataToPlot.length * lineHeight;

    svg = d3.select("#chart").append("svg")
      .attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.top + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", state.height + margin.top + margin.bottom) // + margin.top + margin.bottom);

    xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([margin.left, width + margin.left])

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
        .attr("width", width + margin.left)
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
          let obj = {};
          obj.value = d[state.metric + "_" + raceEths[r]];
          obj.raceEth = r;
          return obj
          // return d[state.metric + "_" + raceEths[r]];
        })
      })
      .join("circle")
        .attr("class", "raceeth")
        .attr("opacity", 1.0)
        .attr("cx", function(d){
          return xScale(d.value);
        })
        .attr("fill", getCircleFill)
        .attr("r", circleSize);

    // Move highlighted elements to front
    moveToFront();

    gs.selectAll(".number-label")
      .data(function(d){
        let d1 = Math.min(d[state.metric + "_" + raceEths[state.raceEth1]], d[state.metric + "_" + raceEths[state.raceEth2]]);
        let d2 = Math.max(d[state.metric + "_" + raceEths[state.raceEth1]], d[state.metric + "_" + raceEths[state.raceEth2]]);
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
        .style("display", function(){
          if (state.showing === 'states') {
            return "none";
          } else {
            return "block";
          }
        })
        .attr("x", width + margin.left + marginRight)
        .attr("y", lineHeight/4)
        .style("text-anchor", "left")
        .style("vertical-align", "middle")
        .attr('fill', 'steelblue')
        .text(function(d, i) {
          if (state.showing === 'states') {
            if ((d[state.name] === 'HI') | (d[state.name] === 'DC')) {
              return null;
            } else {
              return "Show me districts in " + d[state.name];
            }
          } else {
            if (d[state.name].includes('avg')){
              return "Take me back to the state view"
            } else {
              return null;
            }
          }
        })
        .on("click", function(event, d){
          if (state.showing === 'states') {
            if (state.currentState !== d["NAME"]) {
              state.currentState = d["NAME"];
              state.myown = [];
            }
            state.sourceData = districts.filter(function(e){
              return e["NAME"] === state.currentState;
            });
            state.name = "lea_name";
            state.showing = 'districts';
            let idx = statesMenu.indexOf(state.currentState);
            // document.getElementById("state-menu").selectedIndex = idx;
            d3.select("#dropdown3").select(".dropbtn").html(state.currentState);
            showDistrictDivs();
            d3.selectAll(".district-view").style("display", "inline-block")
              .classed("chosen", function(e){
                return e === 'Largest districts';
              });
          } else {
            state.sourceData = states;
            state.name = "NAME";
            state.showing = 'states';
            state.districtView = 'largest';
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
        if (state.showing === 'states') {
          thisG.selectAll(".show-districts")
            .style("display", "block")
          notThisG.selectAll(".show-districts")
            .style("display", "none");
        }

        // Show tooltip if missing data
        let thisData = thisG.data()[0];
        if (isNaN(thisData[state.metric + "_" + raceEths[state.raceEth1]]) | isNaN(thisData[state.metric + "_" + raceEths[state.raceEth2]])){
          dataTooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + lineHeight / 2 + 10) + "px")
            .style("display", "block");
        } else {
          dataTooltip.style("display", "none");
        }

        if ((state.showing === 'states') & ((thisData[state.name] === 'DC') | (thisData[state.name] === 'HI'))) {
          let thisGPos = thisG.node().getBoundingClientRect();
          let yOffset = stateTooltip.node().getBoundingClientRect().height / 2;

          stateTooltip.style("left", (thisGPos.left + width + margin.left + marginRight) + "px")
            .style("top", (event.pageY - yOffset) + "px")
            .style("display", "block");

        } else {
          stateTooltip.style("display", "none");
        }
      } else {
        // gDivisions.classed("hidden", false)
        gDivisions.selectAll(".number-label")
          .classed("hidden", state.showing !== 'districts')
        gDivisions.selectAll(".rect")
          .classed("hidden", true)
          // .style("opacity", 0);
        if (state.showing === 'states'){
          gDivisions.selectAll(".show-districts")
            .style("display", "none");
        }
        dataTooltip.style("display", "none");
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
      if (yScale(0) - lineHeight/2 < thisY && thisY < yScale(state.dataToPlot.length) - lineHeight/2 &&
          margin.left < thisX  && thisX < width){
        let thisData = thisG.data()[0];

        if (state.showing === 'states'){
          if (state.stateFixed === thisData['NAME']) {
            state.stateFixed = null;
          } else {
            state.stateFixed = thisData['NAME'];
          }
        } else {
          if (state.districtFixed === thisData['lea_name']) {
            state.districtFixed = null;
          } else {
            state.districtFixed = thisData['lea_name'];
          }
        }

        highlightFixed();

      }
    });

  }

  function updateChart(){

    processData();

    if (state.showing === 'states') {
      state.height = state.dataToPlot.length * lineHeight;
      yScale = d3.scaleLinear()
        .domain([0, state.dataToPlot.length])
        .rangeRound([margin.top + lineHeight/2, state.height])
    } else {
      state.height = state.dataToPlot.length * lineHeight + 3 * lineHeight / 2;
      yScale = d3.scaleLinear()
        .domain([0, 1, state.dataToPlot.length])
        .rangeRound([margin.top + lineHeight/2, margin.top + 2 * lineHeight, state.height])
    }

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

    if (state.showing == 'districts') {
      gAxisBottom.attr("opacity", 0);
    } else {
      gAxisBottom.attr("opacity", 1);
    }

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
      .attr("width", width + margin.left)
      .attr("height", lineHeight);

    divisionRects
      .attr("class", "rect hidden")
      .attr("fill", "#f5f5f5")
      .attr("x", 0)
      .attr("y", -lineHeight/2)
      .attr("width", width + margin.left)
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
          let obj = {};
          obj.value = d[state.metric + "_" + raceEths[r]];
          obj.raceEth = r;
          return obj
          // return d[state.metric + "_" + raceEths[r]];
        })
      });

    divisionCircles.enter().append("circle")
        .transition().duration(transitionTime)
        .attr("class", "raceeth")
        .attr("opacity", 1.0)
        .attr("cx", function(d){
          return xScale(d.value);
        })
        .attr("fill", getCircleFill)
        .attr("r", circleSize)

    divisionCircles
      .transition().duration(transitionTime)
      .attr("cx", function(d){
        return xScale(d.value);
      })
      .attr("fill", getCircleFill);

    divisionCircles.exit().remove();

    moveToFront();

    // Division numer labels
    let divisionNumberLabels = g.selectAll(".division").selectAll(".number-label")
      .data(function(d){
        let d1 = Math.min(d[state.metric + "_" + raceEths[state.raceEth1]], d[state.metric + "_" + raceEths[state.raceEth2]]);
        let d2 = Math.max(d[state.metric + "_" + raceEths[state.raceEth1]], d[state.metric + "_" + raceEths[state.raceEth2]]);
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
      .style("display", function(){
        if (state.showing === 'states') {
          return "none";
        } else {
          return "block";
        }
      })
      .attr("x", width + margin.left + marginRight)
      .attr("y", lineHeight/4)
      .style("text-anchor", "left")
      .style("vertical-align", "middle")
      .attr('fill', 'steelblue')
      .text(function(d, i) {
        if (state.showing === 'states') {
          if ((d[state.name] === 'HI') | (d[state.name] === 'DC')) {
            return null;
          } else {
            return "Show me districts in " + d[state.name];
          }
        } else {
          if (d[state.name].includes('avg')){
            return "Take me back to the state view"
          } else {
            return null;
          }
        }
      })
      .on("click", function(event, d){
        if (state.showing === 'states') {
          if (state.currentState !== d["NAME"]) {
            state.currentState = d["NAME"];
            state.myown = [];
          }
          state.sourceData = districts.filter(function(e){
            return e["NAME"] === state.currentState;
          });
          state.name = "lea_name";
          state.showing = 'districts';
          let idx = statesMenu.indexOf(state.currentState);
          // document.getElementById("state-menu").selectedIndex = idx;
          d3.select("#dropdown3").select(".dropbtn").html(state.currentState);
          showDistrictDivs();
          d3.selectAll(".district-view").style("display", "inline-block")
            .classed("chosen", function(e){
              return e === 'Largest districts';
            });
          state.districtView = 'largest';
        } else {
          state.sourceData = states;
          state.name = "NAME";
          state.showing = 'states';
          hideDistrictDivs();
          d3.select("#search").style("display", "none");
          d3.select("#selected-districts").style("display", "none");
        }
        updateChart();
      })

    divisionChange
      .attr("class", "show-districts")
      .style("display", function(){
        if (state.showing === 'states') {
          return "none";
        } else {
          return "block";
        }
      })
      .attr("x", width + margin.left + marginRight)
      .attr("y", lineHeight/4)
      .style("text-anchor", "left")
      .style("vertical-align", "middle")
      .attr('fill', 'steelblue')
      .text(function(d, i) {
        if (state.showing === 'states') {
          if ((d[state.name] === 'HI') | (d[state.name] === 'DC')) {
            return null;
          } else {
            return "Show me districts in " + d[state.name];
          }
        } else {
          if (d[state.name].includes('avg')){
            return "Take me back to the state view"
          } else {
            return null;
          }
        }
      })
      .on("click", function(event, d){
        if (state.showing === 'states') {
          if (state.currentState !== d["NAME"]) {
            state.currentState = d["NAME"];
            state.myown = [];
          }
          state.sourceData = districts.filter(function(e){
            return e["NAME"] === state.currentState;
          });
          state.name = "lea_name";
          state.showing = 'districts';
          let idx = statesMenu.indexOf(state.currentState);
          // document.getElementById("state-menu").selectedIndex = idx;
          d3.select("#dropdown3").select(".dropbtn").html(state.currentState);
          showDistrictDivs();
          d3.selectAll(".district-view").style("display", "inline-block")
            .classed("chosen", function(e){
              return e === 'Largest districts';
            });
          state.districtView = 'largest';
        } else {
          state.sourceData = states;
          state.name = "NAME";
          state.showing = 'states';
          hideDistrictDivs();
          d3.select("#search").style("display", "none");
          d3.select("#selected-districts").style("display", "none");
        }
        updateChart();
      })

    divisionChange.exit().remove();

    highlightFixed();
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

const isMobile = $(window).width() < 770;

let offsetWidth, widthChart;

 if (isMobile){
   offsetWidth = 16 + 22;
   widthChart = document.getElementById("chart").offsetWidth;
 } else {
   offsetWidth = 280;
   widthChart = document.getElementById("chart").offsetWidth + offsetWidth;
 }

let margin, svg, g, gs, xScale, yScale, tickValues, totalHeight, yRange;

if (isMobile){
  margin = {top: 20, right: offsetWidth, bottom: 20, left: 100};
} else {
  margin = {top: 20, right: offsetWidth, bottom: 20, left: 150};
}

let width = widthChart - margin.left - margin.right,
    height = 550 - margin.top - margin.bottom;

const transitionTime = 500;
const lineHeight = 14;
const linePadding = 10;
const circleSize = 7;
const numberLabelLeftMargin = 25;
const numberLabelRightMargin = 10;
const marginRight = 40;
const stateTooltipOffset = 10;
const textWidth = margin.left - 15;
// var margin, lineHeight;
// if (mobile) {
//   lineHeight = 10;
//   margin = {top: 30, right: 20, bottom: 20, left: 100};
// } else {
//   lineHeight = 12;
//   margin = {top: 60, right: 20, bottom: 80, left: 180};
// }

let dataTooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("left", 0)
    .style("top", 0)
    .style("display", "none")
    .style("max-width", margin.right + "px")
    .html("<p>In states or districts where fewer than 50 students belong to a certain racial or ethnic group, the group is not displayed.</p>");

let stateTooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("left", 0)
    .style("top", 0)
    .style("display", "none")
    .style("max-width", (margin.right - marginRight - 16)+ "px")
    .html("<p>Because this state has only one traditional public school district, we do not include district-specific breakdowns.</p>");

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
let metricLabels = {
  'Teachers': 'experienced teachers',
  'Classes': 'access to AP classes',
  'Counselors': 'adequate counselors'
}
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
  metric: 'Teachers',
  height: null,
  sourceData: null,
  dataToPlot: null,
  name: null,
  currentState: null,
  showing: 'states',
  districtView: 'largest',
  stateFixed: null,
  districtFixed: null,
  myown: [],
  sortByGap: false,
  expandScale: true,
  yRange: [],
  seeData: null,
}

let districtExplanation = '<p>Use the tabs below to explore the largest 10 districts in the selected state by number of students enrolled or to create your own comparison by adding up to 10 districts in the selected state.</p>';
// let stateExplanation = '<p>When sorting by gap, the tool organizes states by the difference in shares. States where the first racial  or ethnic group selected has a higher share will be displayed toward the top, and states where the second racial or ethnic group selected has a higher share will be displayed toward the bottom.</p>'
let stateExplanation;
if (isMobile) {
  stateExplanation = '<p>Tap a state to explore data by school district</p>';
} else {
  stateExplanation = '<p>Mouse over a state to explore data by school district</p>';
}
let plusIcon = '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23 0H26V48H23V0Z" fill="black"/><path d="M48 23V26L0 26L1.31135e-07 23L48 23Z" fill="black"/></svg>';

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
  if (state.metric === 'Teachers'){
    metricText.html('Research has shown that experienced teachers are more effective than inexperienced teachers, and <a href="https://edtrust.org/resource/5-things-to-advance-equity-in-access-to-strong-and-diverse-educators/" target="_blank">addressing these inequities</a> can improve reading and math test scores. <span>Below, we display the share of teachers who have more than two years of experience.</span></p>')
  } else if (state.metric === 'Classes'){
    metricText.html('By engaging with advanced coursework, students are more likely to graduate from high school and get a head start on postsecondary education. But students of color, including Black and Latino students, continue to <a href="https://edtrust.org/resource/inequities-in-advanced-coursework/" target="_blank">lack access to advanced classes</a>. <span>Below, we display the share of high school students who have access to both an AP math class and an AP science class.</span></p>')
  } else if (state.metric === 'Counselors'){
    metricText.html('School counselors can have an <a href="http://exclusive.multibriefs.com/content/beyond-teachers-estimating-individual-school-counselors-effects-on-educatio/education" target="_blank">outsized impact on a student’s life</a>, leading to increased high school graduation and college enrollment and completion. <span>Below, we display the share of high school students who have access to adequate school counselors, defined as schools with at least <a href="https://www.schoolcounselor.org/Standards-Positions/Position-Statements/ASCA-Position-Statements/The-Professional-Counselor-and-Use-of-Support-Staf" target="_blank">one counselor for every 250 students</a>.</span></p>')
  }
}

function sortData(data) {
  let sortedData;
  if (state.sortByGap) {
    sortedData = data.sort(function(a,b) {
      let thisMetric = metricCols[state.metric];
      let gap1 = a[thisMetric + "_" + raceEths[state.raceEth1]] - a[thisMetric + "_" + raceEths[state.raceEth2]];
      let gap2 = b[thisMetric + "_" + raceEths[state.raceEth1]] - b[thisMetric + "_" + raceEths[state.raceEth2]];
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
      return d[metricCols[state.metric] + "_" + raceEths[r]];
    })
  });
  let extent = d3.extent(allExtents, function(d){
    return d[0];
  });
  let minValue = (Math.floor(extent[0] / 10) * 10);
  xScale.domain([minValue, 100])
    .range([margin.left, width + margin.left]);
  if (isMobile){
    if (minValue > 70) {
      tickValues = d3.range(minValue, 100.01, 5);
    } else if (minValue > 40) {
      tickValues = d3.range(minValue, 100.01, 10);
    } else {
      tickValues = d3.range(minValue, 100.01, 20);
    }
  } else {
    if (minValue > 50) {
      tickValues = d3.range(minValue, 100.01, 5);
    } else {
      tickValues = d3.range(minValue, 100.01, 10);
    }
  }
}

function zoomOutScale() {
  xScale.domain([0, 100])
    .range([margin.left, width + margin.left]);
  if (isMobile) {
    tickValues = d3.range(0, 100.01, 20);
  } else {
    tickValues = d3.range(0, 100.01, 10);
  }
}

function showDistrictDivs() {
  d3.select("#state-div").style("display", "inline");
  d3.select("#dropdown3").style("display", "inline-block");
  d3.select("#explanation-text").html(districtExplanation);
  d3.select("#sticky").style("display", "none");
  if (isMobile) {
    d3.select("#no-data-note").style("display", "block");
  } else {
    // d3.select("#state-back").style("display", "inline");
    d3.select("#go-back-big").style("display", "inline-block");
  }
}

function hideDistrictDivs() {
  d3.select("#state-div").style("display", "none");
  d3.select("#dropdown3").style("display", "none");
  d3.select("#explanation-text").html(stateExplanation);
  d3.selectAll(".district-view").style("display", "none");
  if (isMobile) {
    d3.select("#no-data-note").style("display", "none");
  } else {
    // d3.select("#state-back").style("display", "none");
    d3.select("#go-back-big").style("display", "none");
  }
}

Promise.all([
  d3.csv('data/state_final.csv'),
  d3.csv('data/district_final.csv')
]).then(function(data) {
  var states = data[0];
  var districts = data[1];

  let convertStringToNumbers = function(array, label){

    let dummySvg = d3.select("body").append("svg")
      .attr("width", 0)
      .attr("height", 0);

    let text = dummySvg.append("text")
      .style("font-size", "14px");

    array.forEach(function(d){
      for (let m = 0; m < metrics.length; m++ ) {
        for (let r = 0; r < raceEthsLabels.length; r++ ) {
          let col = metricCols[metrics[m]] + "_" + raceEths[raceEthsLabels[r]];
          if (d[col] === '') {
            d[col] = NaN;
          } else {
            d[col] = +d[col] * 100;
          }
        }
      }

      let words = d[label].split(/\s+/).reverse(),
          line = [words.pop()],
          lineNumber = 1;
      while (word = words.pop()) {
        line.push(word);
        text.text(line.join(" "));
        if (text.node().getComputedTextLength() > textWidth) {
          line = [word];
          text.text(word);
          lineNumber++;
        }
      }
      d.lines = lineNumber;
    })

  }

  convertStringToNumbers(states, "NAME");
  convertStringToNumbers(districts, "lea_name");

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
    if (!event.target.matches('#dropbtn5')) {
      var dropdown = document.getElementById("raceEth1-sticky");
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      }
    }
    if (!event.target.matches('#dropbtn6')) {
      var dropdown = document.getElementById("raceEth2-sticky");
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

  window.addEventListener("scroll", function(event){
    if (state.showing === 'states') {
      let nodeSvg = svg.node().getBoundingClientRect();
      d3.select("#sticky")
        .style("max-width", function(){
          if (isMobile) {
            return "none";
          } else {
            return margin.left + 'px';
          }
        });

      if ((nodeSvg.top > 340) || (nodeSvg.top < -nodeSvg.height + 60)) {
        d3.select("#sticky").style("display", "none");
      } else {
        d3.select("#sticky").style("display", "inline-block");
        updateDropdownHtml("#dropdown4", d3.select("#dropdown4").select(".dropbtn").html());
        updateDropdownHtml("#dropdown5", d3.select("#dropdown5").select(".dropbtn").html());
        updateDropdownHtml("#dropdown6", d3.select("#dropdown6").select(".dropbtn").html());
      }
    }
  })

  function greyOutRaceEth(){
    d3.select("#raceEth1").selectAll("a")
      .classed("not-available", function(d){
        return d === state.raceEth2;
      })

    d3.select("#raceEth2").selectAll("a")
      .classed("not-available", function(d){
        return d === state.raceEth1;
      })

    d3.select("#raceEth1-sticky").selectAll("a")
      .classed("not-available", function(d){
        return d === state.raceEth2;
      })

    d3.select("#raceEth2-sticky").selectAll("a")
      .classed("not-available", function(d){
        return d === state.raceEth1;
      })
  }

  function updateDropdownHtml(id, label) {
    if (isMobile) {
      d3.select(id).style("width", "auto");
      d3.select(id).select(".dropbtn").html(label);
      let prevWidth = d3.select(id).select(".dropbtn").node().getBoundingClientRect().width;
      d3.select(id).style("width", (prevWidth + 35) + "px");
    } else {
      d3.select(id).select(".dropbtn").html(label);
    }
  }

  let raceEthOp1 = addOptions("raceEth1", raceEthsLabels);
  d3.select("#dropdown1")
    .on("click", function(d){
      document.getElementById("raceEth1").classList.toggle("show");
    });
  updateDropdownHtml("#dropdown1", getCircleHtml(twoColors[0]) + state.raceEth1);
  raceEthOp1.selectAll("a").on("click", function(event, d){
    if (d !== state.raceEth2) {
      state.raceEth1 = d;
      updateDropdownHtml("#dropdown1", getCircleHtml(twoColors[0]) + state.raceEth1);
      updateDropdownHtml("#dropdown5", getCircleHtml(twoColors[0]) + state.raceEth1);
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
  updateDropdownHtml("#dropdown2", getCircleHtml(twoColors[1]) + state.raceEth2);
  raceEthOp2.selectAll("a").on("click", function(event, d){
    if (d !== state.raceEth1) {
      state.raceEth2 = d;
      updateDropdownHtml("#dropdown2", getCircleHtml(twoColors[1]) + state.raceEth2);
      updateDropdownHtml("#dropdown6", getCircleHtml(twoColors[1]) + state.raceEth2);
      greyOutRaceEth();
      updateOptionsCircles();
      updateChart();
    }
  })

  let metricOp = addOptions("metric-sticky", metrics.map(function(d){ return metricLabels[d]; }));
  d3.select("#dropdown4")
    .on("click", function(d){
      document.getElementById("metric-sticky").classList.toggle("show");
    });
  updateDropdownHtml("#dropdown4", metricLabels[state.metric]);
  metricOp.selectAll("a").on("click", function(event, d){
    if (d !== metricLabels[state.metric]) {
      state.metric = metrics.filter(function(m){
        return metricLabels[m] === d;
      })[0];
      updateDropdownHtml("#dropdown4", metricLabels[state.metric]);
      d3.selectAll(".metric")
        .classed("chosen", function(e){
          return e === state.metric;
        })
      if (state.metric === 'Teachers'){
        d3.select("#toggle-scale").style("display", "inline-block");
      } else if (state.metric === 'Classes'){
        d3.select("#toggle-scale").style("display", "none");
      } else if (state.metric === 'Counselors'){
        d3.select("#toggle-scale").style("display", "none");
      }
      updateMetricText();
      updateChart();
    }
  })

  let raceEthOp1Sticky = addOptions("raceEth1-sticky", raceEthsLabels);
  d3.select("#dropdown5")
    .on("click", function(d){
      document.getElementById("raceEth1-sticky").classList.toggle("show");
    });
  updateDropdownHtml("#dropdown5", getCircleHtml(twoColors[0]) + state.raceEth1);
  raceEthOp1Sticky.selectAll("a").on("click", function(event, d){
    if (d !== state.raceEth2) {
      state.raceEth1 = d;
      updateDropdownHtml("#dropdown1", getCircleHtml(twoColors[0]) + state.raceEth1);
      updateDropdownHtml("#dropdown5", getCircleHtml(twoColors[0]) + state.raceEth1);
      greyOutRaceEth();
      updateOptionsCircles();
      updateChart();
    }
  })

  let raceEthOp2Sticky = addOptions("raceEth2-sticky", raceEthsLabels);
  d3.select("#dropdown6")
    .on("click", function(d){
      document.getElementById("raceEth2-sticky").classList.toggle("show");
    });
  updateDropdownHtml("#dropdown6", getCircleHtml(twoColors[1]) + state.raceEth2);
  raceEthOp2Sticky.selectAll("a").on("click", function(event, d){
    if (d !== state.raceEth1) {
      state.raceEth2 = d;
      updateDropdownHtml("#dropdown2", getCircleHtml(twoColors[1]) + state.raceEth2);
      updateDropdownHtml("#dropdown6", getCircleHtml(twoColors[1]) + state.raceEth2);
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
  stateOp.selectAll("a").classed("not-available", function(d){
    return ((d === 'Hawaii') || (d === 'District of Columbia'));
  })
  stateOp.selectAll("a").on("click", function(event, d){
    if (state.showing === 'districts') {
      if ((state.currentState !== d) && (d !== 'Hawaii') && (d !== 'District of Columbia')) {
        state.currentState = d;
        state.seeData = d;
        state.myown = [];
      }
      updateDropdownHtml("#dropdown3", state.currentState);
      state.sourceData = districts.filter(function(e){
        return e["NAME"] === state.currentState;
      });
      state.name = "lea_name";
      state.showing = 'districts';
      updateSearchBox();
      updateDistrictsList();
    }
    updateChart();
  })

  // d3.select("#state-back")
  //   .on("click", function(){
  //     if (state.showing === 'districts') {
  //       state.sourceData = states;
  //       state.name = "NAME";
  //       state.showing = 'states';
  //       hideDistrictDivs();
  //       d3.select("#search").style("display", "none");
  //       d3.select("#selected-districts").style("display", "none");
  //       updateChart();
  //     }
  //   })

  d3.select("#go-back-big")
    .on("click", function(){
      if (state.showing === 'districts') {
        state.sourceData = states;
        state.name = "NAME";
        state.showing = 'states';
        hideDistrictDivs();
        d3.select("#search").style("display", "none");
        d3.select("#selected-districts").style("display", "none");
        updateChart();
      }
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
      state.metric = d;
      if (d === 'Teachers'){
        d3.select("#toggle-scale").style("display", "inline-block");
      } else if (d === 'Classes'){
        d3.select("#toggle-scale").style("display", "none");
      } else if (d === 'Counselors'){
        d3.select("#toggle-scale").style("display", "none");
      }
      updateDropdownHtml("#dropdown4", metricLabels[state.metric]);
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

  let districtViews = ['Largest districts', 'Select districts']
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
        state.districtView = 'largest';
        d3.select("#state-div").style("display", "inline-block");
        d3.select("#search").style("display", "none");
        d3.select("#selected-districts").style("display", "none");
      } else {
        d3.select("#search").style("display", "block");
        d3.select("#selected-districts").style("display", "block");
        state.sourceData = districts.filter(function(e){
          return (e["NAME"] === state.currentState);
        })
        state.name = "lea_name";
        state.showing = 'districts';
        state.districtView = 'myown';
        updateSearchBox();
        updateDistrictsList();
      }
      updateChart();
    })
    .html(function(d){
      return d;
    })

  if ($(window).width() < 768) {
    d3.select("#districts-views")
      .selectAll("span")
      .style("text-align", "center")
      .style("white-space", "nowrap")
      .style('width', function(d, i){
        let spanMargin = ($(window).width() - 32 - 169 - 157 - 38) / 2;
        if (i === 0) {
          return (168 + spanMargin) + "px";
        } else {
          return (156 + spanMargin) + "px";
        }
      })
  }

  d3.select("#explanation-text").html(stateExplanation);

  let toggleGap = d3.select("#toggle-gap").select(".slider");
  toggleGap.on("click", function(event, d){
    state.sortByGap = !state.sortByGap;
    updateChart();
  })

  let toggleScale = d3.select("#toggle-scale").select(".slider");
  toggleScale.on("click", function(event, d){
    if (metricCols[state.metric] == 'avg_exp_year_perc') {
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

    let selectedDistricts = districtsList.selectAll(".selected-district")
      .data(state.sourceData.filter(function(d){
        return (state.myown.indexOf(d["lea_name"]) >= 0);
      }));

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
    svg.selectAll(".division").selectAll(".line").raise();
    svg.selectAll(".division").selectAll(".raceeth").filter(function (d,i){
      return ((d.raceEth === state.raceEth1) || (d.raceEth === state.raceEth2));
    }).raise();
    svg.selectAll(".division").selectAll(".number-label").raise();
  }

  let getLineStroke = function(d, i) {
    let thisMetric = metricCols[state.metric]
    if ((!isNaN(d[thisMetric + "_" + raceEths[state.raceEth1]])) && (!isNaN(d[thisMetric + "_" + raceEths[state.raceEth2]]))) {
      if (d[thisMetric + "_" + raceEths[state.raceEth1]] > d[thisMetric + "_" + raceEths[state.raceEth2]]) {
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

  let getDivisionName = function(d){
    let thisMetric = metricCols[state.metric];
    if (isMobile && (isNaN(d[thisMetric + "_" + raceEths[state.raceEth1]]) || isNaN(d[thisMetric + "_" + raceEths[state.raceEth2]]))) {
      return d[state.name] + "*";
    } else {
      return d[state.name];
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

  function processData(initial) {

    if (state.showing === 'states') {
      state.dataToPlot = sortData(state.sourceData);
    } else {
      let sortedData;

      if (state.districtView === 'largest'){
        sortedData = sortData(state.sourceData.filter(function(n) {
          return n.top10_flag === '1';
        }));
      } else {
        sortedData = sortData(state.sourceData.filter(function(d){
          return (state.myown.indexOf(d["lea_name"]) >= 0);
        }));
      }

      // add state average
      let filteredState = states.filter(function(d){
        return d['NAME'] === state.currentState;
      });
      let thisState = {...filteredState[0]};
      thisState.lea_name = thisState['NAME'] + ' avg';

      let dummySvg = d3.select("body").append("svg")
        .attr("width", 0)
        .attr("height", 0);
      let text = dummySvg.append("text")
        .style("font-size", "14px");
      let words = thisState.lea_name.split(/\s+/).reverse(),
          line = [words.pop()],
          lineNumber = 1;

      while (word = words.pop()) {
        line.push(word);
        text.text(line.join(" "));
        if (text.node().getComputedTextLength() > textWidth) {
          line = [word];
          text.text(word);
          lineNumber++;
        }
      }
      thisState.lines = lineNumber;
      state.dataToPlot = [thisState, ...sortedData];
    }

    // For mobile, we highlight the first element on load
    if (initial) {
      state.seeData = state.dataToPlot[0][state.name];
      state.stateFixed = state.dataToPlot[0][state.name];
    }

    if (isMobile && (state.showing === 'states')){
      if (state.seeData === null) {
        d3.select("#see-data").style("display", "none");

        let dy = margin.top + lineHeight/2;
        state.yRange = [dy];
        state.dataToPlot.forEach(function(d, i){
          dy += d.lines * lineHeight + linePadding ;
          state.yRange.push(dy);
        })
        state.height = dy;
      } else {
        let seeData = d3.select("#see-data")
          .style("top", $(window).height() + 'px')
          .style("left", 0)
          .style("display", "block");

        if ((state.seeData === 'Hawaii') || (state.seeData === 'District of Columbia')) {
          let label;
          if (state.seeData === 'Hawaii') {
            label = state.seeData;
          } else {
            label = "the " + state.seeData;
          }
          d3.select("#see-data-button").style("display", "none");
          d3.select("#see-data-text")
            .style("max-width", "none")
            .html("Because " + state.seeData + " has only one traditional public school district, we do not include district-specific breakdowns.");
        } else {
          d3.select("#see-data-button").style("display", "inline-block");
          d3.select("#see-data-text")
            .style("max-width", ($(window).width() - 16 - 150) + "px")
            .html("Want to see data for districts in this state?");
        }
        let seeDataHeight = seeData.node().getBoundingClientRect().height;

        let dy = margin.top + lineHeight/2;
        state.yRange = [dy];
        state.dataToPlot.forEach(function(d, i){
          if (d[state.name] === state.seeData) {
            let chartTop = d3.select("#chart").node().getBoundingClientRect().top;
            let seeData = d3.select("#see-data")
              // .style("top", (event.pageY + lineHeight/2) + 'px')
              .style("top", (window.scrollY + chartTop + dy + linePadding + lineHeight * (d.lines - 1)) + 'px')
              .style("left", 0)
              .style("display", "block");
            let seeDataHeight = seeData.node().getBoundingClientRect().height;
            dy += d.lines * lineHeight + linePadding + seeDataHeight;

            d3.select("#see-data-button").on("click", function(event){
              showDistricts(event, d);
              d3.select("#see-data").style("display", "none");
              d3.select("#go-back").style("display", "block");
            })
          } else {
            dy += d.lines * lineHeight + linePadding ;
          }
          state.yRange.push(dy);
        })
        state.height = dy;
      }
    } else {
      let dy = margin.top + lineHeight/2;
      state.yRange = [dy];
      state.dataToPlot.forEach(function(d, i){
        if ((state.showing === 'districts') && (i === 0)) {
          dy += d.lines * lineHeight + 2 * linePadding;
        } else {
          dy += d.lines * lineHeight + linePadding;
        }
        if (i < state.dataToPlot.length - 1) {
          state.yRange.push(dy);
        }
      })
      state.height = state.yRange[state.yRange.length - 1];
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
        let notThisGroup = gDivisions.filter(function(d,i){
          return d[id] !== reference;
        });
        gDivisions.classed("fixed", function(d, i){
          return d[id] === reference;
        })
        thisGroup.selectAll(".number-label")
          .classed("hidden", false);
        notThisGroup.selectAll(".number-label")
          .classed("hidden", state.showing !== 'districts');
        thisGroup.selectAll(".rect")
          .classed("hidden", false);
        notThisGroup.selectAll(".rect")
          .classed("hidden", true);

        if (!isMobile) {
          thisGroup.selectAll(".show-districts")
            .style("display", "block");
        }
      }
    }

    if (state.showing === 'states') {
      showHighlighted(state.stateFixed, 'NAME');
    } else {
      showHighlighted(state.districtFixed, 'lea_name');
    }

  }

  function wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [words.pop()],
          lineNumber = 0,
          lineHeightText = 1.1 * lineHeight, // ems
          x = text.attr("x"),
          y = text.attr("y"),
          dy = parseFloat(text.attr("0")),
          tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).text(line);
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeightText + "px").text(word);
        }
      }
    });
  }

  function scrollToElement(id){
    function findPos(obj) {
        var curtop = 0;
        if (obj.offsetParent) {
            do {
                curtop += obj.offsetTop;
            } while (obj = obj.offsetParent);
        return curtop;
        }
    }
    window.scroll(0,findPos(document.getElementById(id)) - 50);
  }

  function showDistricts(event, d){
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
      showDistrictDivs();
      updateDropdownHtml("#dropdown3", state.currentState);
      d3.selectAll(".district-view").style("display", "inline-block")
        .classed("chosen", function(e){
          return e === 'Largest districts';
        });
      state.districtView = 'largest';
      if (isMobile) {
        scrollToElement("forms");
      } else {
        scrollToElement("container");
      }
    } else {
      state.sourceData = states;
      state.name = "NAME";
      state.showing = 'states';
      hideDistrictDivs();
      d3.select("#search").style("display", "none");
      d3.select("#selected-districts").style("display", "none");
    }
    updateChart();
  }

  function showStateTooltip(event, d){
    let label;
    if (d[state.name] === 'Hawaii') {
      label = d[state.name];
    } else {
      label = "the " + d[state.name];
    }
    let thisGPos = d3.select(this).node().getBoundingClientRect();
    stateTooltip.style("display", "block");
    let yOffset = stateTooltip.node().getBoundingClientRect().height / 2;
    stateTooltip.style("left", (thisGPos.left + marginRight - stateTooltipOffset) + "px")
      .style("top", (event.pageY - yOffset) + "px")
      .html("<p>Because " + label + " has only one traditional public school district, we do not include district-specific breakdowns.</p>");
  }

  function showDataTooltip(event, d){
    let thisGPos = d3.select(this).node().getBoundingClientRect();
    dataTooltip.style("display", "block");
    let yOffset = dataTooltip.node().getBoundingClientRect().height / 2;
    dataTooltip.style("left", (thisGPos.left + marginRight - stateTooltipOffset) + "px")
      .style("top", (event.pageY - yOffset) + "px");
  }

  function initChart(filteredData) {

    processData(initial=isMobile);

    // state.height = state.dataToPlot.length * lineHeight;

    svg = d3.select("#chart").append("svg")
      .attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.top + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", state.height + margin.top + margin.bottom) // + margin.top + margin.bottom);

    xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([margin.left, width + margin.left])

    // yScale = d3.scaleLinear()
    //   .domain([0, filteredData.length])
    //   .rangeRound([margin.top + lineHeight/2, state.height])

    yScale = d3.scaleLinear()
      .domain(d3.range(filteredData.length))
      .rangeRound(state.yRange);

    // if (isMobile) {
    //   tickValues = d3.range(0, 100.01, 20);
    // } else {
    //   tickValues = d3.range(0, 100.01, 10);
    // }

    // Update scales
    if (metricCols[state.metric] === 'avg_exp_year_perc'){
      if (state.expandScale) {
        zoomInScale();
      } else {
        zoomOutScale();
      }
    } else {
      zoomOutScale();
    }

    var xAxis = function(g) {
      g.attr("transform", `translate(0,${margin.top})`)
      .attr("class", "top-axis")
      .call(d3.axisTop(xScale).tickValues(tickValues).tickFormat(formatPercent))
      .call(g => g.selectAll(".tick line").clone()
                .attr("stroke-opacity", 0.05)
                .attr("class", "axis-line")
                .attr("y2", state.height - lineHeight/2))
      .call(g => g.selectAll(".domain").remove())
    }

    var xAxisBottom = function(g) {
      g.attr("transform", "translate(0," + (state.height + lineHeight) + ")")
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
        .attr("height", function(d){
          return d.lines * lineHeight;
        });

    gs.selectAll(".line")
      .data(function(d){
        return [d];
      })
      .join("line")
        .attr("class", "line")
        .attr("stroke", getLineStroke)
        .attr("stroke-width", 1.0)
        .attr("x1", function(d) {
          return xScale(d[metricCols[state.metric] + "_" + raceEths[state.raceEth1]])
        })
        .attr("x2", function(d) {
          return xScale(d[metricCols[state.metric] + "_" + raceEths[state.raceEth2]])
        });

    gs.selectAll(".raceeth")
      .data(function(d){
        // return raceEthsLabels.map(function(r){
        return [state.raceEth1, state.raceEth2].map(function(r){
          let obj = {};
          obj.value = d[metricCols[state.metric] + "_" + raceEths[r]];
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
        let thisMetric = metricCols[state.metric];
        let d1 = d[thisMetric + "_" + raceEths[state.raceEth1]];
        let d2 = d[thisMetric + "_" + raceEths[state.raceEth2]];
        let dmin, dmax;
        if (isNaN(d1) && isNaN(d2)){
          dmin = NaN;
          dmax = NaN;
        } else if (!isNaN(d1) && isNaN(d2)) {
          dmin = d1;
          dmax = NaN;
        } else if (isNaN(d1) && !isNaN(d2)) {
          dmin = d2;
          dmax = NaN;
        } else {
          dmin = Math.min(d1, d2);
          dmax = Math.max(d1, d2);
        }
        return [dmin, dmax];
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
          if (!isNaN(d)) {
            return Math.floor(d);
          } else {
            return null;
          }
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
        .text(getDivisionName)
        .call(wrap, textWidth)

    gs.selectAll(".help-tooltip")
      .data(function(d){
        return [d];
      })
      .join('g')
        .attr("class", "help-tooltip")
        .attr("transform", "translate("+(width + margin.left + stateTooltipOffset)+",-10)")
        .style("text-anchor", "left")
        .style("vertical-align", "middle")
        .html(function(d, i) {
          if (state.showing === 'states') {
            if ((d[state.name] === 'Hawaii') || (d[state.name] === 'District of Columbia')) {
              return '<circle cx="10" cy="10" r="10" fill="white"/><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 17H9V15H11V17ZM13.07 9.25L12.17 10.17C11.45 10.9 11 11.5 11 13H9V12.5C9 11.4 9.45 10.4 10.17 9.67L11.41 8.41C11.78 8.05 12 7.55 12 7C12 5.9 11.1 5 10 5C8.9 5 8 5.9 8 7H6C6 4.79 7.79 3 10 3C12.21 3 14 4.79 14 7C14 7.88 13.64 8.68 13.07 9.25Z" fill="#D2D2D2"/>';
            } else {
              return null;
            }
          } else {
            if (!isMobile) {
              if (isNaN(d[metricCols[state.metric] + "_" + raceEths[state.raceEth1]]) || isNaN(d[metricCols[state.metric] + "_" + raceEths[state.raceEth2]])) {
                return '<circle cx="10" cy="10" r="10" fill="white"/><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 17H9V15H11V17ZM13.07 9.25L12.17 10.17C11.45 10.9 11 11.5 11 13H9V12.5C9 11.4 9.45 10.4 10.17 9.67L11.41 8.41C11.78 8.05 12 7.55 12 7C12 5.9 11.1 5 10 5C8.9 5 8 5.9 8 7H6C6 4.79 7.79 3 10 3C12.21 3 14 4.79 14 7C14 7.88 13.64 8.68 13.07 9.25Z" fill="#D2D2D2"/>';
              } else {
                return null;
              }
            } else {
              return null;
            }
          }
        })
        .on("click", function(event, d){
          if (isMobile && (state.showing === 'states')) {
            if (state.seeData === d[state.name]) {
              state.seeData = null;
            } else {
              state.seeData = d[state.name];
            }
            updateChart();
          }
        })
        // .on("mouseover", function(event, d) {
        //   if (state.showing === 'states') {
        //     showStateTooltip(event, d);
        //   } else {
        //     showDataTooltip(event, d);
        //   }
        // })
        // .on("mouseout", function(event, d){
        //   if (state.showing === 'states') {
        //     stateTooltip.style("display", "none");
        //   } else {
        //     dataTooltip.style("display", "none");
        //   }
        // })

    if (!isMobile) {
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
              if ((d[state.name] === 'Hawaii') || (d[state.name] === 'District of Columbia')) {
                return null;
              } else {
                return "Show me districts in " + d[state.name];
              }
            } else {
              return null;
            }
          })
          .on("click", showDistricts)

    }

    svg.on("mousemove touchmove", function(event) {
      if (!isMobile){
        let thisX = d3.pointer(event, this)[0],
            thisY = d3.pointer(event, this)[1],
            index = Math.floor(yScale.invert(thisY + lineHeight/2 + linePadding/2));
        let gDivisions = g.selectAll(".division");
        let thisG = gDivisions.filter(function(d,i){
          return i === index;
        });
        let notThisG = gDivisions.filter(function(d,i){
          return i !== index;
        });
        if (yScale(0) - lineHeight/2 < thisY && thisY < yScale(state.dataToPlot.length) - lineHeight/2 &&
            -margin.left < thisX  && thisX < width + margin.right){
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
          if ((state.showing === 'states') && !isMobile) {
            thisG.selectAll(".show-districts")
              .style("display", "block")
            notThisG.selectAll(".show-districts")
              .style("display", "none");
          }

          // Show tooltip if missing data
          let thisData = thisG.data()[0];
          let thisGPos = thisG.node().getBoundingClientRect();

          if (isNaN(thisData[metricCols[state.metric] + "_" + raceEths[state.raceEth1]]) || isNaN(thisData[metricCols[state.metric] + "_" + raceEths[state.raceEth2]])){
            if (isMobile) {
              // d3.select("#mobile-tooltip-text")
              //   .html("<p>In states or districts where fewer than 50 students belong to a certain racial or ethnic group, the group is not displayed.</p>")
              // d3.select("#mobile-tooltip").style("display", "block");
              // d3.select("#mobile-tooltip-header-close").on("click", function(){
              //   d3.select("#mobile-tooltip").style("display", "none");
              // })
            } else {
              let yOffset = dataTooltip.node().getBoundingClientRect().height / 2;
              dataTooltip.style("left", (thisGPos.left + width + margin.left + marginRight) + "px")
                .style("top", (event.pageY - yOffset) + "px")
                .style("display", "block");
            }
          } else {
            if (!isMobile){
              dataTooltip.style("display", "none");
            }
          }

          if (!isMobile){
            if ((state.showing === 'states') & ((thisData[state.name] === 'District of Columbia') || (thisData[state.name] === 'Hawaii'))) {
              let label;
              if (thisData[state.name] === 'Hawaii') {
                label = thisData[state.name];
              } else {
                label = "the " + thisData[state.name];
              }
              stateTooltip.style("display", "block");
              let yOffset = stateTooltip.node().getBoundingClientRect().height / 2;
              stateTooltip.style("left", (thisGPos.left + width + margin.left + marginRight) + "px")
                .style("top", (event.pageY - yOffset) + "px")
                .html("<p>Because " + label + " has only one traditional public school district, we do not include district-specific breakdowns.</p>");
            } else {
              stateTooltip.style("display", "none");
            }
          }

          if (isMobile && (state.showing === 'states')) {
            if (state.seeData === thisData[state.name]) {
              state.seeData = null;
            } else {
              state.seeData = thisData[state.name];
            }
            updateChart();
          }
        } else {
          // gDivisions.classed("hidden", false)
          gDivisions.selectAll(".number-label")
            .classed("hidden", state.showing !== 'districts')
          gDivisions.selectAll(".rect")
            .classed("hidden", true)
            // .style("opacity", 0);
          if ((state.showing === 'states') && !isMobile){
            gDivisions.selectAll(".show-districts")
              .style("display", "none");
          }
          dataTooltip.style("display", "none");
        }
      }
    })
    .on("click", function(event){
      let thisX = d3.pointer(event, this)[0],
          thisY = d3.pointer(event, this)[1],
          index = Math.floor(yScale.invert(thisY + lineHeight/2 + linePadding/2));
      let gDivisions = g.selectAll(".division");
      let thisG = gDivisions.filter(function(d,i){
        return i === index;
      });
      if (yScale(0) - lineHeight/2 < thisY && thisY < yScale(state.dataToPlot.length) - lineHeight/2 &&
          -margin.left < thisX  && thisX < width){
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

        if (isMobile && (state.showing === 'states')) {
          if (state.seeData === thisData[state.name]) {
            state.seeData = null;
          } else {
            state.seeData = thisData[state.name];
          }
          updateChart();
        }
        highlightFixed();
      }
    });

    d3.select("#go-back").on("click", function(){
      state.sourceData = states;
      state.name = "NAME";
      state.showing = 'states';
      hideDistrictDivs();
      d3.select("#search").style("display", "none");
      d3.select("#selected-districts").style("display", "none");
      d3.select("#see-data").style("display", "none");
      d3.select(this).style("display", "none");

      updateChart();
    })

    highlightFixed();
  }

  function updateChart(){

    processData(initial=false);

    // if (state.showing === 'states') {
    //   state.height = state.dataToPlot.length * lineHeight;
    //   yScale = d3.scaleLinear()
    //     .domain([0, state.dataToPlot.length])
    //     .rangeRound([margin.top + lineHeight/2, state.height])
    // } else {
    //   state.height = state.dataToPlot.length * lineHeight + 3 * lineHeight / 2;
    //   yScale = d3.scaleLinear()
    //     .domain([0, 1, state.dataToPlot.length])
    //     .rangeRound([margin.top + lineHeight/2, margin.top + 2 * lineHeight, state.height])
    // }

    if (state.dataToPlot.length === 1){
      yScale = d3.scaleLinear()
        .domain([0, 0])
        .rangeRound([state.yRange[0], state.yRange[0]]);
    } else {
      yScale = d3.scaleLinear()
        .domain(d3.range(state.dataToPlot.length))
        .rangeRound(state.yRange);
    }

    if (state.showing === 'states') {
      svg.attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.top + margin.bottom])
        .attr("width", width + margin.left + margin.right)
        .attr("height", state.height + margin.top + margin.bottom);
    } else {
      svg.attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.top])
        .attr("width", width + margin.left + margin.right)
        .attr("height", state.height + margin.top);
    }


    // Update scales
    if (metricCols[state.metric] === 'avg_exp_year_perc'){
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
                .attr("y2", state.height - lineHeight/2))
      .call(g => g.selectAll(".domain").remove());

    var gAxisBottom = svg.selectAll(".bottom-axis");

    gAxisBottom.attr("transform", "translate(0," + (state.height + lineHeight) + ")")
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
        return ((state.showing === 'districts') && (i === 0));
      })
      .attr("transform", function (d, i) {
        return "translate(0," + yScale(i) + ")";
      });;

    gDivisions.attr("class", "division")
      .classed("state-average", function(d, i){
        return ((state.showing === 'districts') && (i === 0));
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
      .attr("height", function(d){
        return d.lines * lineHeight;
      });

    divisionRects
      .attr("class", "rect hidden")
      .attr("fill", "#f5f5f5")
      .attr("x", 0)
      .attr("y", -lineHeight/2)
      .attr("width", width + margin.left)
      .attr("height", function(d){
        return d.lines * lineHeight;
      });

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
      .text(getDivisionName)
      .call(wrap, textWidth);

    divisionNames
      .attr("class", "division-name")
      .attr("x", 0)
      .attr("y", lineHeight/4)
      .style("text-anchor", "right")
      .style("vertical-align", "middle")
      .attr('fill', 'black')
      .text(getDivisionName)
      .call(wrap, textWidth)

    divisionNames.exit().remove();

    // Division lines
    let divisionLines =  g.selectAll(".division").selectAll(".line")
      .data(function(d){
        return [d];
      });

    divisionLines.enter().append("line")
      .attr("class", "line")
      .attr("stroke", getLineStroke)
      .attr("stroke-width", 1.0)
      .attr("x1", function(d) {
        return xScale(d[metricCols[state.metric] + "_" + raceEths[state.raceEth1]])
      })
      .attr("x2", function(d) {
        return xScale(d[metricCols[state.metric] + "_" + raceEths[state.raceEth2]])
      });

    divisionLines
      .attr("stroke", getLineStroke)
      .attr("x1", function(d) {
        return xScale(d[metricCols[state.metric] + "_" + raceEths[state.raceEth1]])
      })
      .attr("x2", function(d) {
        return xScale(d[metricCols[state.metric] + "_" + raceEths[state.raceEth2]])
      });

    divisionLines.exit().remove();

    let divisionCircles = g.selectAll(".division").selectAll(".raceeth")
      .data(function(d){
        // return raceEthsLabels.map(function(r){
        return [state.raceEth1, state.raceEth2].map(function(r){
          let obj = {};
          obj.value = d[metricCols[state.metric] + "_" + raceEths[r]];
          obj.raceEth = r;
          return obj
          // return d[state.metric + "_" + raceEths[r]];
        })
      });

    divisionCircles.enter().append("circle")
        .attr("class", "raceeth")
        .attr("opacity", 1.0)
        .attr("cx", function(d){
          return xScale(d.value);
        })
        .attr("fill", getCircleFill)
        .attr("r", circleSize)

    divisionCircles
      .attr("cx", function(d){
        return xScale(d.value);
      })
      .attr("fill", getCircleFill);

    divisionCircles.exit().remove();

    // Division numer labels
    let divisionNumberLabels = g.selectAll(".division").selectAll(".number-label")
      .data(function(d){
        let thisMetric = metricCols[state.metric];
        let d1 = d[thisMetric + "_" + raceEths[state.raceEth1]];
        let d2 = d[thisMetric + "_" + raceEths[state.raceEth2]];
        let dmin, dmax;
        if (isNaN(d1) && isNaN(d2)){
          dmin = NaN;
          dmax = NaN;
        } else if (!isNaN(d1) && isNaN(d2)) {
          dmin = d1;
          dmax = NaN;
        } else if (isNaN(d1) && !isNaN(d2)) {
          dmin = d2;
          dmax = NaN;
        } else {
          dmin = Math.min(d1, d2);
          dmax = Math.max(d1, d2);
        }
        return [dmin, dmax];
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
          if (!isNaN(d)) {
            return Math.floor(d);
          } else {
            return null;
          }
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
          if (!isNaN(d)) {
            return Math.floor(d);
          } else {
            return null;
          }
        })

    divisionNumberLabels.exit().remove();

    let helpTooltips = g.selectAll(".division").selectAll(".help-tooltip")
      .data(function(d){
        return [d];
      })

      helpTooltips.enter().append('g')
        .attr("class", "help-tooltip")
        .attr("transform", "translate("+(width + margin.left + stateTooltipOffset)+",-10)")
        .style("text-anchor", "left")
        .style("vertical-align", "middle")
        .html(function(d, i) {
          if (state.showing === 'states') {
            if ((d[state.name] === 'Hawaii') || (d[state.name] === 'District of Columbia')) {
              return '<circle cx="10" cy="10" r="10" fill="white"/><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 17H9V15H11V17ZM13.07 9.25L12.17 10.17C11.45 10.9 11 11.5 11 13H9V12.5C9 11.4 9.45 10.4 10.17 9.67L11.41 8.41C11.78 8.05 12 7.55 12 7C12 5.9 11.1 5 10 5C8.9 5 8 5.9 8 7H6C6 4.79 7.79 3 10 3C12.21 3 14 4.79 14 7C14 7.88 13.64 8.68 13.07 9.25Z" fill="#D2D2D2"/>';
            } else {
              return null;
            }
          } else {
            if (!isMobile) {
              if (isNaN(d[metricCols[state.metric] + "_" + raceEths[state.raceEth1]]) || isNaN(d[metricCols[state.metric] + "_" + raceEths[state.raceEth2]])) {
                return '<circle cx="10" cy="10" r="10" fill="white"/><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 17H9V15H11V17ZM13.07 9.25L12.17 10.17C11.45 10.9 11 11.5 11 13H9V12.5C9 11.4 9.45 10.4 10.17 9.67L11.41 8.41C11.78 8.05 12 7.55 12 7C12 5.9 11.1 5 10 5C8.9 5 8 5.9 8 7H6C6 4.79 7.79 3 10 3C12.21 3 14 4.79 14 7C14 7.88 13.64 8.68 13.07 9.25Z" fill="#D2D2D2"/>';
              } else {
                return null;
              }
            } else {
              return null;
            }
          }
        })
        .on("click", function(event, d){
          if (isMobile && (state.showing === 'states')) {
            if (state.seeData === d[state.name]) {
              state.seeData = null;
            } else {
              state.seeData = d[state.name];
            }
            updateChart();
          }
        })
        // .on("mouseover", function(event, d) {
        //   if (state.showing === 'states') {
        //     showStateTooltip(event, d);
        //   } else {
        //     showDataTooltip(event, d);
        //   }
        // })
        // .on("mouseout", function(event, d){
        //   if (state.showing === 'states') {
        //     stateTooltip.style("display", "none");
        //   } else {
        //     dataTooltip.style("display", "none");
        //   }
        // })

      helpTooltips
        .attr("class", "help-tooltip")
        .attr("transform", "translate("+(width + margin.left + stateTooltipOffset)+",-10)")
        .style("text-anchor", "left")
        .style("vertical-align", "middle")
        .html(function(d, i) {
          if (state.showing === 'states') {
            if ((d[state.name] === 'Hawaii') || (d[state.name] === 'District of Columbia')) {
              return '<circle cx="10" cy="10" r="10" fill="white"/><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 17H9V15H11V17ZM13.07 9.25L12.17 10.17C11.45 10.9 11 11.5 11 13H9V12.5C9 11.4 9.45 10.4 10.17 9.67L11.41 8.41C11.78 8.05 12 7.55 12 7C12 5.9 11.1 5 10 5C8.9 5 8 5.9 8 7H6C6 4.79 7.79 3 10 3C12.21 3 14 4.79 14 7C14 7.88 13.64 8.68 13.07 9.25Z" fill="#D2D2D2"/>';
            } else {
              return null;
            }
          } else {
            if (!isMobile) {
              if (isNaN(d[metricCols[state.metric] + "_" + raceEths[state.raceEth1]]) || isNaN(d[metricCols[state.metric] + "_" + raceEths[state.raceEth2]])) {
                return '<circle cx="10" cy="10" r="10" fill="white"/><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 17H9V15H11V17ZM13.07 9.25L12.17 10.17C11.45 10.9 11 11.5 11 13H9V12.5C9 11.4 9.45 10.4 10.17 9.67L11.41 8.41C11.78 8.05 12 7.55 12 7C12 5.9 11.1 5 10 5C8.9 5 8 5.9 8 7H6C6 4.79 7.79 3 10 3C12.21 3 14 4.79 14 7C14 7.88 13.64 8.68 13.07 9.25Z" fill="#D2D2D2"/>';
              } else {
                return null;
              }
            } else {
              return null;
            }
          }
        })
        .on("click", function(event, d){
          if (isMobile && (state.showing === 'states')) {
            if (state.seeData === d[state.name]) {
              state.seeData = null;
            } else {
              state.seeData = d[state.name];
            }
            updateChart();
          }
        })
        // .on("mouseover", function(event, d) {
        //   if (state.showing === 'states') {
        //     showStateTooltip(event, d);
        //   } else {
        //     showDataTooltip(event, d);
        //   }
        // })
        // .on("mouseout", function(event, d){
        //   if (state.showing === 'states') {
        //     stateTooltip.style("display", "none");
        //   } else {
        //     dataTooltip.style("display", "none");
        //   }
        // })

      helpTooltips.exit().remove();

    moveToFront();

    // Division change division
    if (!isMobile) {
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
            if ((d[state.name] === 'Hawaii') || (d[state.name] === 'District of Columbia')) {
              return null;
            } else {
              return "Show me districts in " + d[state.name];
            }
          } else {
            return null;
          }
        })
        .on("click", showDistricts)

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
            if ((d[state.name] === 'Hawaii') || (d[state.name] === 'District of Columbia')) {
              return null;
            } else {
              return "Show me districts in " + d[state.name];
            }
          } else {
            return null;
          }
        })
        .on("click", showDistricts)

      divisionChange.exit().remove();

    }

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

var widthChart = document.getElementById("chart").offsetWidth;

let svg, g, xScale, yScale;
const transitionTime = 500;

var margin = {top: 20, right: 50, bottom: 20, left: 40},
    width = widthChart - margin.left - margin.right,
    height = 550 - margin.top - margin.bottom;

var lineHeight = 12;
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

var state = {
  raceEth1: 'Black',
  raceEth2: 'white',
  metric: 'avg_exp_year_perc',
  height: null,
  data: null,
  name: null,
  currentState: null,
  showing: 'states',
  myown: [],
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

function addOptions(id, values) {
  var element = d3.select("#"+id);
  var options = element.selectAll("option").data(values);

  options.enter().append("option")
    .html(function(d){
      return d;
    });

  options.exit().remove();

  element.selectAll("option").each(function(d, i){
    if (d === state[id]) {
      document.getElementById(id).selectedIndex = i;
    }
  });

  return element;
}


Promise.all([
  d3.csv('data/early_state_draft.csv'),
  d3.csv('data/early_district_draft.csv')
]).then(function(data) {
  var states = data[0];
  var districts = data[1];

  state.data = states;
  state.name = "STUSPS";

  let newRaceEthValue;
  let raceEthOp1 = addOptions("raceEth1", raceEths);
  raceEthOp1.on("change", function(d, i){
    newRaceEthValue = d3.select(this).node().value;
    if (newRaceEthValue !== state.raceEth2) {
      state.raceEth1 = d3.select(this).node().value;
      updateChart(state.data);
    } else {
      let idx = raceEths.indexOf(state.raceEth1);
      document.getElementById("raceEth1").selectedIndex = idx;
    }
  })

  let raceEthOp2 = addOptions("raceEth2", raceEths);
  raceEthOp2.on("change", function(d){
    newRaceEthValue = d3.select(this).node().value;
    if (newRaceEthValue !== state.raceEth1) {
      state.raceEth2 = d3.select(this).node().value;
      updateChart(state.data);
    } else {
      let idx = raceEths.indexOf(state.raceEth2);
      document.getElementById("raceEth2").selectedIndex = idx;
    }
  })

  let statesMenu = getUniquesMenu(states, "STUSPS");
  let stateOp = addOptions("state-menu", statesMenu);
  stateOp.style("display", function(d){
      if (state.showing === 'states') {
        return "none";
      } else {
        return "block";
      }
    })
    .on("change", function(d){
      newStateValue = d3.select(this).node().value;
      if (state.showing === 'districts') {
        if (state.currentState !== newStateValue) {
          state.currentState = newStateValue;
          state.myown = [];
        }
        state.data = districts.filter(function(e){
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
      state.data = districts.filter(function(e){
        return e["STUSPS"] === state.currentState;
      });
      state.name = "leaid";
      state.showing = 'districts';
      d3.select("#state-menu").style("display", "block");
      d3.select("#search").style("display", "none");
    } else {
      d3.select("#search").style("display", "block");
      state.data = districts.filter(function(e){
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

    searchBox.attr("placeholder", "Start typing..." + state.myown.length + "/10")
      .on("change", function(){
        let searchLabel = d3.select(this);
        let searchedLabel = searchLabel.property("value");
        let idxLabel = theseDistricts.indexOf(searchedLabel.toLowerCase());
        let nSelected = state.myown.length;
        let isSelected = state.myown.indexOf(searchedLabel.toLowerCase()) >= 0;

        if ((idxLabel >= 0) && (nSelected < 10) && (!isSelected)) {
          state.myown.push(theseDistricts[idxLabel]);
          searchLabel.node().value = "";
          state.data = districts.filter(function(e){
            return ((e["STUSPS"] === state.currentState) && (state.myown.indexOf(e["leaid"]) >= 0));
          })
          updateChart();
          d3.select(this).attr("placeholder", "Start typing..." + state.myown.length + "/10")
        }
      })
  }

  function initChart(filteredData) {

    color1 = "#1696d2"
    color2 = "#fdbf11"
    state.height = filteredData.length * lineHeight;

    svg = d3.select("#chart").append("svg")
      .attr("viewBox", [0, 0, width + margin.left + margin.right, state.height]) // + margin.top + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", state.height) // + margin.top + margin.bottom);

    xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([margin.left, width])

    yScale = d3.scaleLinear()
      .domain([0, filteredData.length])
      .rangeRound([margin.top + lineHeight/2, state.height])

    g = svg.append("g")
        .style("font", "10px sans-serif")

    var gs = g.selectAll("g")
      .data(filteredData)
      .join("g")
        .attr("class", "division")
        .attr("transform", function (d, i) {
          return "translate(0," + yScale(i) + ")";
        });

    gs.selectAll(".line")
      .data(function(d){
        return [d];
      })
      .join("line")
        .attr("class", "line")
        .attr("stroke", function(d,i){
           if (d[state.metric + "_" + state.raceEth1] > d[state.metric + "_" + state.raceEth2]) {
             return color1;
           } else {
             return color2;
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
            return color1
          } else if (raceEths[i] === state.raceEth2) {
            return color2
          } else {
            return "#d2d2d2"
          }
        })
        .attr("r", 3.5)


      gs.selectAll(".number-label")
        .data(function(d){
          let d1 = Math.min(d[state.metric + "_" + state.raceEth1], d[state.metric + "_" + state.raceEth2]);
          let d2 = Math.max(d[state.metric + "_" + state.raceEth1], d[state.metric + "_" + state.raceEth2]);
          return [d1, d2];
        })
        .join("text")
          .attr("class", "number-label")
          .attr("x", function(d, i){
            if (i === 0){
              return xScale(d) - 25;
            } else {
              return xScale(d) + 5;
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
          .style("opacity", 0)
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
        .attr("x", width)
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
            state.data = districts.filter(function(e){
              return e["STUSPS"] === state.currentState;
            });
            state.name = "leaid";
            state.showing = 'districts';
            let idx = statesMenu.indexOf(state.currentState);
            document.getElementById("state-menu").selectedIndex = idx;
            d3.select("#state-menu").style("display", "block");
            d3.selectAll(".district-view").style("display", "block")
              .classed("chosen", function(e){
                return e === 'largest';
              });
          } else {
            state.data = states;
            state.name = "STUSPS";
            state.showing = 'states';
            d3.select("#state-menu").style("display", "none");
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
      if (yScale(0) - lineHeight/2 < thisY && thisY < yScale(state.data.length) - lineHeight/2 &&
          margin.left < thisX  && thisX < width + 25){
        gDivisions.classed("hidden", function(d, i){
          return i !== index;
        })
        thisG.selectAll(".number-label")
          .style("opacity", 1)
        notThisG.selectAll(".number-label")
          .style("opacity", 0);
        thisG.selectAll(".show-districts")
          .style("display", "block")
        notThisG.selectAll(".show-districts")
          .style("display", "none");
      } else {
        gDivisions.classed("hidden", false)
        gDivisions.selectAll(".number-label")
          .style("opacity", 0);
        gDivisions.selectAll(".show-districts")
          .style("display", "none");
      }
    });

  }

  function updateChart(){
    state.height = state.data.length * lineHeight;

    svg.attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.top + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", state.height + margin.top + margin.bottom);

    // Division groups
    var gDivisions = g.selectAll(".division").data(state.data);

    gDivisions.enter().append("g")
      .attr("class", "division")
      .attr("transform", function (d, i) {
        return "translate(0," + yScale(i) + ")";
      });;

    gDivisions.attr("class", "division")
      .attr("transform", function (d, i) {
        return "translate(0," + yScale(i) + ")";
      });

    gDivisions.exit().remove();

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
           return color1;
         } else {
           return color2;
         }
      })
      .attr("stroke-width", 1.0)
      .attr("x1", d => xScale(d[state.metric + "_" + state.raceEth1]))
      .attr("x2", d => xScale(d[state.metric + "_" + state.raceEth2]));

    divisionLines.transition().duration(transitionTime)
      .attr("stroke", function(d,i){
         if (d[state.metric + "_" + state.raceEth1] > d[state.metric + "_" + state.raceEth2]) {
           return color1;
         } else {
           return color2;
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
            return color1
          } else if (raceEths[i] === state.raceEth2) {
            return color2
          } else {
            return "#d2d2d2"
          }
        })
        .attr("r", 3.5)

    divisionCircles
      .transition().duration(transitionTime)
      .attr("cx", function(d){
        return xScale(d)
      })
      .attr("fill", function(d,i){
        if (raceEths[i] === state.raceEth1) {
          return color1
        } else if (raceEths[i] === state.raceEth2) {
          return color2
        } else {
          return "#d2d2d2"
        }
      });

    divisionCircles.exit().remove();

    // Division numer labels
    let divisionNumberLabels = g.selectAll(".division").selectAll(".number-label")
      .data(function(d){
        let d1 = Math.min(d[state.metric + "_" + state.raceEth1], d[state.metric + "_" + state.raceEth2]);
        let d2 = Math.max(d[state.metric + "_" + state.raceEth1], d[state.metric + "_" + state.raceEth2]);
        return [d1, d2];
      })

    divisionNumberLabels.enter().append("text")
        .attr("class", "number-label")
        .attr("x", function(d, i){
          if (i === 0){
            return xScale(d) - 25;
          } else {
            return xScale(d) + 5;
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
        .style("opacity", 0)
        .attr("y", lineHeight/4)
        .attr("fill", "black")
        .text(function(d){
          return d.toFixed(2);
        })

    divisionNumberLabels
        .attr("class", "number-label")
        .attr("x", function(d, i){
          if (i === 0){
            return xScale(d) - 25;
          } else {
            return xScale(d) + 5;
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
        .style("opacity", 0)
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
      .attr("x", width)
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
          state.data = districts.filter(function(e){
            return e["STUSPS"] === state.currentState;
          });
          state.name = "leaid";
          state.showing = 'districts';
          let idx = statesMenu.indexOf(state.currentState);
          document.getElementById("state-menu").selectedIndex = idx;
          d3.select("#state-menu").style("display", "block");
          d3.selectAll(".district-view").style("display", "block")
            .classed("chosen", function(e){
              return e === 'largest';
            });
        } else {
          state.data = states;
          state.name = "STUSPS";
          state.showing = 'states';
          d3.select("#state-menu").style("display", "none");
          d3.selectAll(".district-view").style("display", "none");
          d3.select("#search").style("display", "none");
        }
        updateChart();
      })

    divisionChange
      .attr("class", "show-districts")
      .style("display", "none")
      .attr("x", width)
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
          state.data = districts.filter(function(e){
            return e["STUSPS"] === state.currentState;
          });
          state.name = "leaid";
          state.showing = 'districts';
          let idx = statesMenu.indexOf(state.currentState);
          document.getElementById("state-menu").selectedIndex = idx;
          d3.select("#state-menu").style("display", "block");
          d3.selectAll(".district-view").style("display", "block")
            .classed("chosen", function(e){
              return e === 'largest';
            });
        } else {
          state.data = states;
          state.name = "STUSPS";
          state.showing = 'states';
          d3.select("#state-menu").style("display", "none");
          d3.selectAll(".district-view").style("display", "none");
          d3.select("#search").style("display", "none");
        }
        updateChart();
      })

    divisionChange.exit().remove();
  }

  initChart(state.data);

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

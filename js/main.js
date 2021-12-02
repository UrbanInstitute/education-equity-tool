var widthChart = document.getElementById("chart").offsetWidth;

let svg, g, xScale, yScale;
const transitionTime = 500;

var margin = {top: 60, right: 50, bottom: 30, left: 40},
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
  showing: 'states',
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


function drawChart(states, districts) {

  states.forEach(function(d) {
    d.pct = +d.pct
  })

  var nestedData = d3.nest()
  .key(function(d) {
    return d.metrics
  })
  .entries(states)

  console.log(nestedData)

  var xScale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, width])

  var yScale = d3.scalePoint()
    .domain(states.map(function(d) {
      return d.race_eth
    }))
    .range([15, height])
    .padding(0.55)

  var svgs = d3.select("#chart")
  .selectAll("svg")
  .data(nestedData)

  svgs.exit()
  .remove()

  enterSvgs = svgs.enter()
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("transform", "translate(" + margin.left + ", " + margin.top + ")")

  svgs = enterSvgs.merge(svgs)
  .attr("id", function(d) {
    return d.key;
  })

  var dots = svgs.selectAll("dots")
    .data(function(d, i) {
      var min = d3.min(d.values, function(d) {
        return d.pct;
      })
      var max = d3.max(d.values, function(d) {
        return d.pct;
      })

    return d.values
    })
  .enter()
  .append("circle")
  .attr("r", 5)
  .attr("cy", function(d) {
    return yScale(d.race_eth)
  })
  .attr("cx", function(d) {
    return xScale(d.pct)
  })
  .attr("class", function(d) {
    return d.STUSPS
  })
  .attr("fill", "#d2d2d2")
  .attr("stroke", "black")
  .attr("pointer-events", "all")
  .style("opacity", 0.5)


  // axis

  var axisLeft = d3.axisLeft()
  .scale(yScale)

  var yAxis = svgs.selectAll("g.yAxis")
    .data([nestedData])

    yAxis
    .enter()
    .append("g")
    .attr("class", "yAxis")
    .call(axisLeft)
    .call(function(t) {
      t.selectAll("text")
      .attr("x", 0)
      .attr("dy", "-17")
      .style("text-anchor", "start")
      t.select(".domain").remove()
      t.selectAll("line")
        .attr("x2", width)
        .attr("stroke-opacity", 0.1)
    })

    var axisBottom = d3.axisBottom()
    .scale(xScale)

    var xAxis = svgs.selectAll("g.xAxis")
      .data([nestedData])

      xAxis
      .enter()
      .append("g")
      .attr("class", "xAxis")
      .attr("transform", "translate(0," + (height - (margin.bottom + 3))+ ")")
      .call(axisBottom)
      .call(function(t) {
        t.select(".domain").remove()
        t.selectAll("line")
          .attr("dy", "-15")
      })

} //drawChart ends here

function highlightStates(thisState) {
  var allSvg = d3.selectAll("svg");
  var thisDots = "circle." + thisState;
  var dotsState = allSvg.selectAll(thisDots)

  dotsState
  .attr("fill", "blue")
  .attr("r", 10)

  dotsState.moveToFront();
}

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
      // filterData();
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
      // filterData();
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
        state.data = districts.filter(function(e){
          return e["STUSPS"] === newStateValue;
        });
        state.name = "leaid";
        state.showing = 'districts';
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
      updateChart(state.data);
    })
    .classed("chosen", function(d){
      return d === 'Teachers';
    })
    .html(function(d){
      return d;
    })

  console.log(states, districts);

  function initChart(filteredData) {

    color1 = "#1696d2"
    color2 = "#fdbf11"
    state.height = filteredData.length * lineHeight;

    svg = d3.select("#chart").append("svg")
      .attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", state.height + margin.bottom);

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

    gs//.append("g")
      .selectAll(".raceeth")
      // .data(raceEths.filter(function(d){
      //   return  // FILTER VALID VALUES
      // }))
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


      gs//.append("g")
        //.attr("class", "number-labels")
        //.style("opacity", 0)
        .selectAll(".number-label")
        // .data(raceEths.filter(function(d){
        //   return  // FILTER VALID VALUES
        // }))
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
          // .attr("opacity", 0)
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
            state.data = districts.filter(function(e){
              return e["STUSPS"] === d["STUSPS"];
            });
            state.name = "leaid";
            state.showing = 'districts';
            let idx = statesMenu.indexOf(d["STUSPS"]);
            document.getElementById("state-menu").selectedIndex = idx;
            d3.select("#state-menu").style("display", "block");
          } else {
            state.data = states;
            state.name = "STUSPS";
            state.showing = 'states';
            d3.select("#state-menu").style("display", "none");
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
    // state.height = state.data.length * lineHeight;

    svg.attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.bottom])
      .attr("width", width + margin.left + margin.right)
      .attr("height", state.height + margin.bottom);

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
      // .data(raceEths.filter(function(d){
      //   return  // FILTER VALID VALUES
      // }))
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
        // .attr("opacity", 0)
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
        // .attr("opacity", 0)
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
          state.data = districts.filter(function(e){
            return e["STUSPS"] === d["STUSPS"];
          });
          state.name = "leaid";
          state.showing = 'districts';
          let idx = statesMenu.indexOf(d["STUSPS"]);
          document.getElementById("state-menu").selectedIndex = idx;
          d3.select("#state-menu").style("display", "block");
        } else {
          state.data = states;
          state.name = "STUSPS";
          state.showing = 'states';
          d3.select("#state-menu").style("display", "none");
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
          state.data = districts.filter(function(e){
            return e["STUSPS"] === d["STUSPS"];
          });
          state.name = "leaid";
          state.showing = 'districts';
          let idx = statesMenu.indexOf(d["STUSPS"]);
          document.getElementById("state-menu").selectedIndex = idx;
          d3.select("#state-menu").style("display", "block");
        } else {
          state.data = states;
          state.name = "STUSPS";
          state.showing = 'states';
          d3.select("#state-menu").style("display", "none");
        }
        updateChart();
      })

    divisionChange.exit().remove();
  }

  // state.data = districts.filter(function(d){
  //   return d["STUSPS"] === 'AK';
  // });
  // state.name = "leaid";
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

var widthChart = document.getElementById("chart").offsetWidth;

var margin = {top: 60, right: 50, bottom: 30, left: 20},
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

var raceEths = ['Black', 'Hisp', 'aian', 'asian', 'nhpi', 'twomore', 'white']

var state = {
  height: null
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

function initChart(filteredData, metric) {

  raceEth1 = 'Black'
  raceEth2 = 'white'
  color1 = "#1696d2"
  color2 = "#fdbf11"
  state.height = filteredData.length * lineHeight;

  var svg = d3.select("#chart").append("svg")
    .attr("viewBox", [0, 0, width + margin.left + margin.right, state.height + margin.bottom])
    .attr("width", width + margin.left + margin.right)
    .attr("height", state.height + margin.bottom);

  var xScale = d3.scaleLinear()
    .domain([0, 1])
    .range([margin.left, width])

  var yScale = d3.scaleLinear()
    .domain([0, filteredData.length])
    .rangeRound([margin.top + lineHeight/2, state.height])

  const g = svg.append("g")
      .style("font", "10px sans-serif")

  var gs = g.selectAll("g")
    .data(filteredData)
    .join("g")
      .attr("class", "division")
      .attr("transform", function (d, i) {
        return "translate(0," + yScale(i) + ")";
      });

  gs.append("line")
    .attr("stroke", function(d,i){
       if (d[metric + "_" + raceEth1] > d[metric + "_" + raceEth2]) {
         return color1;
       } else {
         return color2;
       }
    })
    .attr("stroke-width", 1.0)
    .attr("x1", d => xScale(d[metric + "_" + raceEth1]))
    .attr("x2", d => xScale(d[metric + "_" + raceEth2]));

  gs.append("g")
    .selectAll(".raceeth")
    // .data(raceEths.filter(function(d){
    //   return  // FILTER VALID VALUES
    // }))
    .data(function(d){
      return raceEths.map(function(r){
        return d[metric + "_" + r];
      })
    })
    .join("circle")
      .attr("class", "raceeth")
      .attr("opacity", 1.0)
      .attr("cx", function(d){
        return xScale(d)
      })
      .attr("fill", function(d,i){
        if (raceEths[i] === raceEth1) {
          return color1
        } else if (raceEths[i] === raceEth2) {
          return color2
        } else {
          return "#d2d2d2"
        }
      })
      .attr("r", 3.5)

  gs.append('text')
    .attr("x", 0)
    .attr("y", lineHeight/4)
    .style("text-anchor", "right")
    .style("vertical-align", "middle")
    .attr('fill', 'black')
    .text(function(d){
      return d['STUSPS']
    })

}

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


Promise.all([
  d3.csv('data/early_state_draft.csv'),
  d3.csv('data/EDP-preliminary-by-district.csv')
]).then(function(data) {
  var states = data[0];
  var districts = data[1];

  console.log(states, districts);

  metric = 'percent_adq_couns'

  var statesMenu = getUniquesMenu(states, "STUSPS");
  console.log(statesMenu)

  initChart(states, metric)

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

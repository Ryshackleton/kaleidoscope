/**
 * Created by ryshackleton on 5/15/17.
 * Modified from: http://bl.ocks.org/bbest/2de0e25d4840c68f2db1
 *  with updates to be d3 v4 compatible
 */

var width = 500,
    height = 500,
    radius = Math.min(width, height) / 2,
    innerRadius = 0; //  0.3 * radius;

var pie = d3.pie()
    .sort(null)
    .value(function(d)
    {
        return d.width;
    });

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([0, 0])
    .html(function(d)
    {
        return "<span style='color:"+d.data.color+"'>"+d.data.legend_label + "</span>: "+d.data.label_major +"</br>"+ "Feeling: "+ d.data.label_minor;
    });

var arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(function(d)
    {
        d.innerRadius = innerRadius;
        d.outerRadius = (radius - innerRadius) * (d.data.height_var / 100.0) + innerRadius;
        return d.outerRadius;
    });

var outlineArc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(radius);

d3.select("body").append("h1")
    .text("Kaleidoscope Cannabis Logo/Terpene Pie Mockup");

d3.select("body").append("h2")
    .text("Mouseover pie slices to see info (can add labels later)");

d3.select("body").append("h2")
    .text("Click on a slice to toggle random terpene values");

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

svg.call(tip);


var prevEndAngle = 0;

d3.csv('dist/data/kaleidoscope_logo_data.csv', function(error, data)
{
    var sliceWidth = 1 / data.length; // constant slice width
    data.forEach(function(d)
    {
        d.width = sliceWidth;
    });
    // for (var i = 0; i < data.score; i++) { console.log(data[i].id) }
    
    var path = svg.selectAll(".solidArc")
        .data(pie(data))
        .enter().append("path")
        .each(function(d) {
            d.prevEndAngle = prevEndAngle;
            prevEndAngle = d.endAngle;
        })
        .attr("fill", function(d)
        {
            return d.data.color;
        })
        .attr("class", "solidArc")
        .attr("stroke", "gray")
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .on('click', toggleRandomValues)
        // .attr("d", arc)
        .transition()
        .ease(d3.easeLinear)
        .delay(function(d,i){
            return i * 400;
        })
        .duration(200)
        .attrTween("d", tweenPie)
    ;
    
    // var outerPath = svg.selectAll(".outlineArc")
    //     .data(pie(data))
    //     .enter().append("path")
    //     .attr("fill", "none")
    //     .attr("stroke", "gray")
    //     .attr("class", "outlineArc")
    //     .attr("d", outlineArc);
});

function toggleRandomValues()
{
    var path = svg.selectAll(".solidArc")
        .each(function(d)
        {
            d.data.height_var = Math.random() * 100;
        })
        .transition()
        .ease(d3.easeLinear)
        .duration(800)
        .attrTween("d", tweenDonut)
        ;
    
}

function tweenPie(b)
{
    // b.innerRadius = 0;
    var i = d3.interpolate({startAngle: b.prevEndAngle, endAngle: b.prevEndAngle}, b);
    return function(t)
    {
        return arc(i(t));
    };
}

function tweenDonut(b)
{
    b.innerRadius = radius * .6;
    var i = d3.interpolate({innerRadius: 0}, b);
    return function(t)
    {
        return arc(i(t));
    };
}

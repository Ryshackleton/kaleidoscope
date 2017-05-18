/**
 * reusable D3 aster plot
 * requires D3 and D3 tip
 * Created by ryshackleton on 5/16/17.
 */
var d3 = d3 || {};
d3.aster = function(options) {
    // Default options. Pass to constructor to modify, or use methods below to change
    var defaultOptions =
        {
            margin: { top: 10, left: 10, right: 10, bottom: 10 },
            width: 500,
            height: 500,
            radius: function(){
                return Math.min(this.width - this.margin.left - this.margin.right,
                                this.height - this.margin.top - this.margin.bottom) / 2; },
            innerRadius: 0,
            showOuterArc: false, // shows an outline of the pie slices and the outer arc
            showWidthLabels: false,
            showHeightLabels: false,
            // transition methods: "changeLengthSlice", "narrowSlice" "sweepSlice", "twistSlice"
            transitionMethod: "changeLengthSlice",
            // changes animation speed and delay
            transitionDuration: 50,
            transitionDelay: 200
        };
    
    var self = this;
    // merge default and input options (overwriting defaults where applicable)
    self.options = Object.assign({}, defaultOptions, options);
    // d3 constructs
    var svg = null,
        heightScale = d3.scaleLinear(),
        pie = d3.pie()
                .sort(null)
                .value(function(d)
                {
                    return d.width_var;
                }),
        arc = d3.arc(),
        tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([0, 0])
                .html(function(d)
                {
                    return "<span style='color:"+d.data.color+"'>"
                        +d.data.label_arc_short + "</span>: "
                        +d.data.label_arc_long +"</br>"
                        + d.data.label_legend;
                }),
        outlineArc = d3.arc()
    ;
    
    // main render method to expose API
    function my(selection) {
        
        var tweenFunc = getTweenFunction();
        
        selection.each(function(selectionData) {
            // clone the data
            var data = JSON.parse(JSON.stringify(selectionData));
    
            // get data range and update the height scale and arc generators appropriately
            var hmin = d3.min(data,function(d){ return d.height_var; });
            var hmax = d3.max(data,function(d){ return d.height_var; });
            heightScale.domain([hmin,hmax])
                        .range([self.options.radius()*0.3,self.options.radius()-self.options.innerRadius]);
            updateArcs();
                
            // check for data.width_var variable, if it doesn't exist, make slices even widths
            var sliceWidth = 1 / data.length; // constant slice width
            data.forEach(function(d) {
                if( typeof(d.width_var ) === "undefined" )
                {
                    d.width_var = sliceWidth;
                }
            });
    
            // Select the svg element, if it exists.
            svg = d3.select(this).selectAll("svg").data([data]);

            // Otherwise, create the skeletal chart.
            var gEnter = svg.enter().append("svg"); //.append("g");
            gEnter.append("g").attr("class", "pie-arcs-group");
            gEnter.append("g").attr("class", "pie-arcs-labels");
            gEnter.append("g").attr("class", "outer-arcs-group");
            
            fadeOutLabels();
            
            // re-select the svg (upon creation, svg will not have been appended)
            svg = d3.select(this).selectAll("svg")
                    .attr("width",self.options.width)
                    .attr("height",self.options.height)
                    .call(tip);
            
            var pieData = pie(data);
            var g = svg.select(".pie-arcs-group")
                .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")");
    
            // create some hidden arcs to attach labels to
            var hiddenPathUpdate = g.selectAll(".hiddenArc")
                .data(pieData);
    
            var hiddenPath = hiddenPathUpdate
                .enter()
                .append("path")
                .attr("fill-opacity", 0)
                .attr("class", "hiddenArc")
                .merge(hiddenPathUpdate); // MERGE enter & update
    
            hiddenPath
                .attr("id", function(d) { return "labelArc_"+d.data.id; }) //Give each slice a unique ID
                .attr("d", arc)
                .transition()
                .on("end", fadeInLabels(pieData) )
            ;
            
            // created the visible arcs
            var pathUpdate = g.selectAll(".solidArc")
                            .data(pieData);
            
            var path = pathUpdate
                .enter()
                .append("path")
                .attr("stroke", "gray")
                .attr("class", "solidArc")
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .merge(pathUpdate); // MERGE enter & update
            
            pathUpdate.exit().remove();
    
            var prevEndAngle = 0; // copy the previous end angle to the next slice (for sweep transition effect)
            path.each(function(d) {
                        d.prevEndAngle = prevEndAngle;
                        prevEndAngle = d.endAngle;
                    });
            
            // update everything else
            path.attr("fill", function(d)
                {
                    return d.data.color;
                })
                .transition()
                .ease(d3.easeLinear)
                .delay(getDelayFunction())
                .duration(getDurationForTween())
                .attrTween("d", tweenFunc)
            ;
            
            updateArcLabels(pieData);
            updateValueLabels(pieData);
            updateOuterArc(pieData);
        });

    }
    
    function updateOuterArc(pieData)
    {
        if( self.options.showOuterArc )
        {
            svg.selectAll(".outer-arcs-group")
                .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")")
                .selectAll(".outlineArc")
                .data(pieData)
                .enter().append("path")
                .attr("fill", "none")
                .attr("stroke", "gray")
                .attr("class", "outlineArc")
                .attr("d", outlineArc);
        }
        else
        {
            svg.selectAll(".outlineArc").remove();
        }
    }
    
    function fadeOutLabels() {
        svg.select(".pie-arcs-labels")
            .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")")
            .style("opacity",0);
    }
    
    function fadeInLabels(pieData)
    {
        svg.select(".pie-arcs-labels")
            .transition()
            .delay(function(){
                if( self.options.transitionMethod === "sweepSlice" )
                    return self.options.transitionDelay * (1+pieData.length);
                return self.options.transitionDelay;
            })
            .duration(getDurationForTween())
            .style("opacity",1);
    }
    
    function updateValueLabels(pieData){
        
        if( !self.options.showHeightLabels )
            return;
    
        var g = svg.select(".pie-arcs-labels")
            .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")");
        
        var labelData = pieData.filter(function(d)
        {
            return d.endAngle - d.startAngle > .2;
        });
    
        var insideLabelsUpdate = g.selectAll(".solidArcDataLabels")
            .data(labelData);
    
        var insideLabels = insideLabelsUpdate
            .enter()
            .append("text")
            .attr("class", "solidArcDataLabels")
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("fill", "White")
            .style("font-size", self.options.width * 0.25 + "%")
            .style("font", "bold Arial")
            .merge(insideLabelsUpdate);
    
        insideLabels
            .transition()
            .ease(d3.easeLinear)
            .delay(getDelayFunction())
            .duration(getDurationForTween())
            .attr("transform", function(d) { //set the label's origin to the center of the arc
                //we have to make sure to set these before calling arc.centroid
                d.outerRadius = self.options.radius(); // Set Outer Coordinate
                d.innerRadius = self.options.innerRadius; // Set Inner Coordinate
                var offset = d.outerRadius - d.innerRadius / 3;
                var centroid = arc.centroid(d);
                return "translate(" + arc.centroid(d) + ")rotate(" + angle(d) + ")";
            })
            .text(function(d) {
                var str = (+d.data.height_var).toFixed(0);
                if( d.data.label_height_unit !== undefined )
                    str += d.data.label_height_unit;
                return  str; });
    
        insideLabelsUpdate.exit().remove();
    
        // Computes the angle of an arc, converting from radians to degrees.
        function angle(d) {
            var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
            return a > 90 ? a - 180 : a;
        }
    }
    
    function updateArcLabels(pieData)
    {
        if( !self.options.showWidthLabels )
            return;
        
        var labelData = pieData.filter(function(d)
        {
            return d.endAngle - d.startAngle > .2;
        });
        
        var arcLabelsUpdate = svg.select(".pie-arcs-labels")
            .attr("transform", "translate(" + self.options.width / 2 + "," + self.options.height / 2 + ")")
            .selectAll(".arcLabelsText")
            .data(labelData);
        
        var arcLabels = arcLabelsUpdate
                .enter()
                .append("text")
                .attr("fill-opacity",1)
                .attr("class", "arcLabelsText")
                .attr("id",function(d){ return "text_label_"+d.data.id;})
                .style("fill", "White" )
                .style("stroke-width", 0.25 )
                .style("stroke","black")
                .style("font-size", self.options.width * 0.3 + "%")
                .attr("x", function(d){ return 0.05 * self.options.radius() * (d.endAngle - d.startAngle);} ) //Move the text from the start angle of the arc
                // .attr("dy", "14px") //Move the text down
                .attr("dy", function(d) { return Math.round((self.options.radius() - self.options.innerRadius )*0.1) })
                .style("font", "bold Arial")
            .merge(arcLabelsUpdate)
        
        arcLabels
            .each(function(d) {
                var arcLabel = d3.select(this);
                var textPath = arcLabel.select("textPath");
                if( textPath.nodes().length < 1 ){
                    textPath = arcLabel.append("textPath");
                }
                textPath
                    .attr("xlink:href", "#labelArc_" + d.data.id )
                    .text( d.data.label_arc_short )
                ;
            })
        ;
    }
    
    function updateArcs()
    {
        arc.innerRadius(self.options.innerRadius)
            .outerRadius(function(d)
            {
                d.innerRadius = self.options.innerRadius;
                d.outerRadius = heightScale(d.data.height_var) + self.options.innerRadius;
                return d.outerRadius;
            });
        
        outlineArc.innerRadius(self.options.innerRadius)
                    .outerRadius(self.options.radius())
    }
    
    function getDelayFunction() {
        switch (self.options.transitionMethod) {
            case 'sweepSlice':
                return function(d,i){
                    return (i + 1) * self.options.transitionDelay;
                };
                break;
            default:
                return self.options.transitionDelay;
        }
    }
    
    function getDurationForTween() {
        switch (self.options.transitionMethod) {
            case 'sweepSlice':
                return function(d,i){
                    return self.options.transitionDuration;
                };
                break;
            default:
                return self.options.transitionDuration * 3;
        }
    }
    
    function getTweenFunction() {
    
        // transition methods: "changeLengthSlice", "narrowSlice" "sweepSlice", "twistSlice"
        switch (self.options.transitionMethod) {
            case 'changeLengthSlice':
                return tweenChangeLength;
                break;
            case 'sweepSlice':
                return tweenSweep;
                break;
            case 'twistSlice':
                return tweenTwist;
                break;
            case 'narrowSlice':
                return tweenNarrow;
                break;
            default:
                return tweenChangeLength;
        }
    
        // tweening functions
        function tweenChangeLength(b)
        {
            // standard, just transition to the appropriate radius
            var i = d3.interpolate({innerRadius: 0}, b);
            return function(t)
            {
                return arc(i(t));
            };
        }
        function tweenSweep(b)
        {
            var i = d3.interpolate({startAngle: b.prevEndAngle, endAngle: b.prevEndAngle }, b);
            return function(t)
            {
                return arc(i(t));
            };
        }
        function tweenNarrow(b)
        {
            // narrow slices slightly while transition is occurring
            var i = d3.interpolate({innerRadius: 0, padAngle: (b.endAngle - b.startAngle) * 0.2 }, b);
        
            return function(t)
            {
                return arc(i(t));
            };
        }
        function tweenTwist(b)
        {
            // twist slices
            var i = d3.interpolate(
                {
                    innerRadius: 0, startAngle: b.prevEndAngle + Math.PI, endAngle: b.prevEndAngle
                }, b);
            return function(t)
            {
                return arc(i(t));
            };
        }
    }
    
    // getter/setters
    my.margin = function(d) {
        if( arguments.length === 0 )
            return self.options.margin;
        self.options.margin = Object.assign({},defaultOptions.margin,d);
        return my;
    };
    
    my.width = function(d) {
        if( arguments.length === 0 )
            return self.options.width;
        self.options.width = d;
        return my;
    };
    
    my.height = function(d) {
        if( arguments.length === 0 )
            return self.options.height;
        height = d;
        return my;
    };
    
    my.innerRadius = function(d) {
        if( arguments.length === 0 )
            return self.options.innerRadius;
        self.options.innerRadius = d;
        return my;
    };
    
    my.transitionMethod = function(d) {
        if( arguments.length === 0 )
            return self.options.transitionMethod;
        self.options.transitionMethod = d;
        return my;
    };
    
    my.transitionMethodsArray = function() {
        return [ "changeLengthSlice", "narrowSlice", "sweepSlice", "twistSlice" ];
    };
    
    my.showOuterArc = function(d) {
        if( arguments.length === 0 )
            return self.options.showOuterArc;
        self.options.showOuterArc = d;
        return my;
    };
    
    my.showWidthLabels = function(d) {
        if( arguments.length === 0 )
            return self.options.showWidthLabels;
        self.options.showWidthLabels = d;
        return my;
    };
    
    my.showHeightLabels = function(d) {
        if( arguments.length === 0 )
            return self.options.showHeightLabels;
        self.options.showHeightLabels = d;
        return my;
    };
    
    my.tip = function(d) {
        if( arguments.length === 0 )
            return tip;
        tip = d;
        return my;
    };
    
    my.transitionDuration = function(d) {
        if( arguments.length === 0 )
            return self.options.transitionDuration;
        self.options.transitionDuration = d;
        return my;
    };
    
    my.transitionDelay = function(d) {
        if( arguments.length === 0 )
            return self.options.transitionDelay;
        self.options.transitionDelay = d;
        return my;
    };
    
    return my;
    
};
